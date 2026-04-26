import {
  HttpException,
  UnauthorizedException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RefreshTokens, Roles } from '@prisma/client';

export interface jwtPayloadType {
  sub: number;
  email: string;
  roles: Roles[];
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) { }

  async getTokensById(id: number): Promise<RefreshTokens[]> {
    const tokens = await this.prisma.user.findUnique({
      where: { id },
      select: { refreshTokens: true },
    });
    if (!tokens) throw new UnauthorizedException(`Token not found`);
    return tokens.refreshTokens; // get values from refreshTokens field
  }

  async createToken(refreshToken: string, id: number) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshTokens.create({
      data: {
        tokenHash,
        userId: id,
        expiresAt: expirationTime,
        revokedAt: null,
      },
    });
  }

  async removeToken(res: Response, refreshToken: string, id: number) {
    const tokenId = await this.handleTokenReuse(res, refreshToken, id);
    await this.prisma.refreshTokens.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  async handleTokenReuse(res: Response, refreshToken: string, id: number) {
    // compare
    const tokens = await this.getTokensById(id);
    let tokenId = -1;
    const now = new Date();

    for (const token of tokens) {
      if (
        (await bcrypt.compare(refreshToken, token.tokenHash || '')) &&
        token.revokedAt == null &&
        token.expiresAt > now
      ) {
        tokenId = token.id;
      }
    }
    // If token not found there's a possibility that token was stolen,
    // so we revoke tokens and re-login user
    if (tokenId < 0) {
      await this.prisma.refreshTokens.updateMany({
        where: { userId: id },
        data: { revokedAt: new Date() },
      });
      res.clearCookie(`refreshToken`, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      throw new UnauthorizedException();
    }
    return tokenId;
  }

  async verifyToken(req: Request) {
    const refreshToken = req.cookies[`refreshToken`];
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');
    let payload: jwtPayloadType;

    try {
      payload = await this.jwt.verify(refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH,
      });
    } catch (err) {
      throw new UnauthorizedException(
        `There's no refreshToken in your cookies`
      );
    }
    return { refreshToken, payload };
  }

  async signToken(
    res: Response,
    payload: jwtPayloadType,
    oldRefreshToken?: string
  ): Promise<{ accessToken: string }> {
    // generate new tokens
    const newRefreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET_REFRESH,
      expiresIn: '7d',
    });

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET_ACCESS,
      expiresIn: '15m',
    });

    // remove old and create new token
    if (oldRefreshToken)
      await this.removeToken(res, oldRefreshToken, payload.sub);
    await this.createToken(newRefreshToken, payload.sub);

    // send tokens to user
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken };
  }
}
