import { UnauthorizedException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { jwtPayloadInterface } from 'src/libs/common/interfaces/jwtPayload.interface';
import * as bcrypt from 'bcrypt';
import { REFRESH_TOKEN_EXPIRES_IN_MILLISECONDS } from 'src/libs/common/constraints/tokens.const';
import { RefreshToken } from '@prisma/client';

@Injectable()
export class TokenDBService {
  constructor(private readonly prisma: PrismaService) { }

  async getTokensById(id: number): Promise<RefreshToken[]> {
    const user = await this.prisma.user.findFirst({
      where: { id },
      select: {
        id: true,
        refreshTokens: true,
      },
    });
    if (!user) throw new UnauthorizedException(`Token not found`);
    // get values from refreshTokens field
    return user.refreshTokens;
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
    if (!payload.jti) throw new UnauthorizedException(`Token doesn't exist`);
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

        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
        });
        if (user) {
          const platforms = user.platforms.filter((item) => item != platform);
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              platforms,
            },
          });
        }
      }
    }
  }
}
