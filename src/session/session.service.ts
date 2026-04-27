import { UnauthorizedException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RefreshTokens } from '@prisma/client';
import { jwtPayloadType } from 'src/token/token.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) { }

  async getTokensById(id: number): Promise<RefreshTokens[]> {
    const tokens = await this.prisma.user.findMany({
      where: { id },
      select: {
        id: true,
        refreshTokens: true,
      },
    });
    if (!tokens) throw new UnauthorizedException(`Token not found`);
    // get values from refreshTokens field
    return tokens[0].refreshTokens as RefreshTokens[];
  }

  async createToken(
    refreshToken: string,
    payload: jwtPayloadType,
    platform?: string
  ) {
    // hash token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshTokens.create({
      data: {
        tokenHash,
        userId: payload.sub,
        expiresAt: expirationTime,
        revokedAt: null,
        platform,
        jti: payload.jti || '',
      },
    });
  }

  async removeToken(
    payload: jwtPayloadType,
    platform?: string,
    logout = false
  ) {
    if (payload.jti) {
      await this.prisma.refreshTokens.update({
        where: { jti: payload.jti },
        data: { revokedAt: new Date() },
      });
      if (platform && logout) {
        await this.prisma.refreshTokens.updateMany({
          where: {
            AND: [{ userId: payload.sub }, { platform }],
          },
          data: { revokedAt: new Date() },
        });
      }
    }
  }
}
