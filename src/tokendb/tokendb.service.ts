import { UnauthorizedException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { jwtPayloadInterface } from 'src/libs/common/interfaces/jwtPayload.interface';
import * as bcrypt from 'bcrypt';
import { REFRESH_TOKEN_EXPIRES_IN_MILLISECONDS } from 'src/libs/common/constraints/tokens.const';
import { RefreshToken } from '@prisma/client';
import { AuthProviders } from 'src/libs/common/enums/AuthProviders.enum';

@Injectable()
export class TokenDBService {
  constructor(private readonly prisma: PrismaService) { }

  async getTokensById(id: number): Promise<RefreshToken[]> {
    const tokens = await this.prisma.user.findFirst({
      where: { AND: [{ id }, { methods: { has: AuthProviders.CREDENTIALS } }] },
      select: {
        id: true,
        refreshTokens: true,
      },
    });
    if (!tokens) throw new UnauthorizedException(`Token not found`);
    // get values from refreshTokens field
    return tokens[0].accounts.refreshTokens as RefreshToken[];
  }

  async createToken(
    refreshToken: string,
    payload: jwtPayloadInterface,
    platform?: string
  ) {
    // hash token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expirationTime = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRES_IN_MILLISECONDS
    );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        expiresAt: expirationTime,
        revokedAt: null,
        platform,
        userId: payload.sub,
        jti: payload.jti || '',
      },
    });
  }

  async removeToken(
    payload: jwtPayloadInterface,
    logout = false,
    platform?: string
  ) {
    if (payload.jti) {
      await this.prisma.refreshToken.update({
        where: { jti: payload.jti },
        data: { revokedAt: new Date() },
      });
      // remove by device
      if (platform && logout) {
        await this.prisma.refreshToken.updateMany({
          where: {
            AND: [{ userId: payload.sub }, { platform }],
          },
          data: { revokedAt: new Date() },
        });
      }
    }
  }
}
