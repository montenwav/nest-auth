import {
  UnauthorizedException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { jwtPayloadInterface } from 'src/libs/common/interfaces/jwtPayload.interface';
import {
  REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  ACCESS_TOKEN_EXPIRES_IN,
} from 'src/libs/common/constraints/tokens.const';
import { TokenDBService } from 'src/tokendb/tokendb.service';
import { AuthProviders, RefreshToken, User } from '@prisma/client';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly tokendb: TokenDBService
  ) { }

  async handleTokenReuse(refreshToken: string, payload: jwtPayloadInterface) {
    // JWT checks
    const tokens = await this.tokendb.getTokensById(payload.sub);
    // revokedAt null means that the token is active, if we have revoke date setted therefore it's not
    const matchedToken = tokens.find(
      (token: RefreshToken) => token.jti === payload.jti
    );

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
    let payload: jwtPayloadInterface;

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
    payload: jwtPayloadInterface,
    platform?: string,
    oldRefreshToken?: string
  ): Promise<{ accessToken: string }> {
    const jti = randomUUID();
    // generate new tokens
    // remove exp and iat from payload, because we will generate new ones
    const { exp, iat, ...accessPayload } = payload;
    const refreshPayload = { ...accessPayload, jti };

    // we set jti to tan compare it with writes it our DB
    const newRefreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: process.env.JWT_SECRET_REFRESH,
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    // here we don't use jti because we don't need to compare accessToken
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: process.env.JWT_SECRET_ACCESS,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    // remove old and create new token
    // if we login in first time, oldRefreshToken will be null, so we will not remove it
    if (oldRefreshToken)
      await this.tokendb.removeToken(payload, false, platform);
    await this.tokendb.createToken(newRefreshToken, refreshPayload, platform);

    // send tokens to user
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });
    return { accessToken };
  }
}
