import { UnauthorizedException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RefreshTokens, Roles } from '@prisma/client';

export interface jwtPayloadType {
  sub: number;
  email: string;
  roles: Roles[];
  exp?: string;
  iat?: string;
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
    // get values from refreshTokens field
    return tokens.refreshTokens;
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
    const tokens = await this.getTokensById(id);
    const now = new Date();
    let matchedToken: RefreshTokens | null = null;
    // Compare
    for (const token of tokens) {
      if (await bcrypt.compare(refreshToken, token.tokenHash || '')) {
        matchedToken = token;
        break;
      }
    }

    // JWT checks
    if (!matchedToken) throw new UnauthorizedException('Token not found');
    if (matchedToken.expiresAt < now)
      throw new UnauthorizedException('Token expired');
    // If token not found there's a possibility that token was stolen,
    // so we revoke old token and re-login user
    if (matchedToken && matchedToken.revokedAt !== null) {
      await this.prisma.refreshTokens.update({
        where: { id: matchedToken.id },
        data: { revokedAt: new Date() },
      });
      res.clearCookie(`refreshToken`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      });

      throw new UnauthorizedException('Token reuse activity');
    }
    return matchedToken.id;
  }

  async verifyToken(req: Request) {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken)
      throw new UnauthorizedException(
        'field refreshToken missing in your cookies'
      );
    let payload: jwtPayloadType;

    try {
      payload = await this.jwt.verify(refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH,
      });
    } catch (err) {
      throw new UnauthorizedException('Token is not valid');
    }
    return { refreshToken, payload };
  }

  async signToken(
    res: Response,
    payload: jwtPayloadType,
    oldRefreshToken?: string
  ): Promise<{ accessToken: string }> {
    // generate new tokens
    const { exp, iat, ...cleanPayload } = payload;

    const newRefreshToken = await this.jwt.signAsync(cleanPayload, {
      secret: process.env.JWT_SECRET_REFRESH,
      expiresIn: '7d',
    });

    const accessToken = await this.jwt.signAsync(cleanPayload, {
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken };
  }
}
