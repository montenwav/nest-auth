import {
  UnauthorizedException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import { Roles } from '@prisma/client';
import { randomUUID } from 'crypto';
import { SessionService } from 'src/session/session.service';

export interface jwtPayloadType {
  sub: number;
  email: string;
  roles: Roles[];
  jti?: string;
  exp?: string;
  iat?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly session: SessionService
  ) { }

  async handleTokenReuse(refreshToken: string, payload: jwtPayloadType) {
    // JWT checks
    const tokens = await this.session.getTokensById(payload.sub);
    // revokedAt null means that the token is active, if we have revoke date setted therefore it's not
    const matchedToken = tokens.find((token) => token.jti === payload.jti);

    // If token not passsed compare stage there's a possibility that token was stolen,
    // so we revoke old token and re-login user
    if (!matchedToken || matchedToken.revokedAt != null) {
      throw new ForbiddenException('Reuse detected');
    }

    if (matchedToken.tokenHash) {
      const isValid = await bcrypt.compare(
        refreshToken,
        matchedToken.tokenHash
      );
      if (!isValid) throw new ForbiddenException('Token not found');
    }
  }

  async verifyToken(req: Request) {
    // just verify token and send return
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken)
      throw new UnauthorizedException(
        'Field refreshToken missing in your cookies'
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
    platform?: string,
    oldRefreshToken?: string
  ): Promise<{ accessToken: string }> {
    // Session_ID
    const jti = randomUUID();
    // generate new tokens
    // remove exp and iat from payload, because we will generate new ones
    const { exp, iat, ...accessPayload } = payload;
    const refreshPayload = { ...accessPayload, jti };

    // we set jti to tan compare it with writes it our DB
    const newRefreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: process.env.JWT_SECRET_REFRESH,
      expiresIn: '7d',
    });

    // here we don't use jti because we don't need to compare accessToken
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: process.env.JWT_SECRET_ACCESS,
      expiresIn: '15m',
    });
    // remove old and create new token
    // if we login in first time, oldRefreshToken will be null, so we will not remove it
    if (oldRefreshToken) await this.session.removeToken(payload, platform);
    await this.session.createToken(newRefreshToken, refreshPayload, platform);

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
