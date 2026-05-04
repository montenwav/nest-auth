import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/LoginUser.dto';
import { Response, Request } from 'express';
import { TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';
import { RegisterUserDto } from './dto/RegisterUser.dto';
import { jwtPayloadInterface } from 'src/libs/common/interfaces/jwtPayload.interface';
import { User } from '@prisma/client';
import { OAuthProfileType } from './types/oAuthProfile.type';
import { CreateUserType } from './types/createUser.type';
import { CheckAccountsType } from './types/checkAccounts.type';
import { TokenDBService } from 'src/tokendb/tokendb.service';

@Injectable()
export class AuthService {
  constructor(
    private tokendb: TokenDBService,
    private token: TokenService,
    private user: UserService
  ) { }

  async register(dto: RegisterUserDto) {
    const existingUser = await this.user.getUserByEmail(dto.email);
    if (existingUser) {
      throw new ForbiddenException('Credentials taken');
    }
    const user = await this.user.createUser(dto as CreateUserType);
    return user;
  }

  async refresh(res: Response, req: Request) {
    const platform = req.headers['user-agent'];

    const { refreshToken: oldRefreshToken, payload } =
      await this.token.verifyToken(req);
    await this.token.handleTokenReuse(oldRefreshToken, payload);

    // revoke old token and sign new
    const { accessToken } = await this.token.signToken(
      res,
      payload,
      platform,
      oldRefreshToken
    );
    // we use express res instead of return, we need to send response manually
    res.status(201).json({ accessToken });
  }

  async checkAccounts(
    data: CheckAccountsType,
    platform?: string
  ): Promise<User> {
    // If account doesn't exist (may include OAuth or Credentials)
    // we search for user by email and check password
    // If user doesn't exist we create a new user with linked account
    let account: any = await this.user.getAccountByProviderId(
      (data as OAuthProfileType).provider || 'CREDENTIALS', // OAuth provider or Credentials login
      (data as OAuthProfileType).providerId || data.email // OAuth providerId or email for Credentials
    );

    // Return only when email is verified
    if (account) {
      await this.user.updateUser(data as OAuthProfileType, platform);
      if ((data as OAuthProfileType).isEmailVerified) {
        return account.user;
      }
    }

    let user = await this.user.getUserByEmail((data as LoginUserDto).email);
    if (user && user.hash && (data as LoginUserDto).password) {
      const passCheck = await bcrypt.compare(
        (data as LoginUserDto).password,
        user.hash || ''
      );
      if (!passCheck) throw new UnauthorizedException('Password is incorrect');
      return user;
    }

    if (!user) {
      user = await this.user.createUser(data as CreateUserType);
      return user;
    }

    await this.user.createAccount(data, user.id);
    return user;
  }

  async login(res: Response, req: Request, dto?: LoginUserDto) {
    const platform = req.headers['user-agent'];
    // dto for credentials or req.user for OAuth
    const user = await this.checkAccounts(dto as CheckAccountsType, platform);

    // send tokens to user
    const payload: jwtPayloadInterface = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };
    // we don't send refresh token on login because we don't have it on that stage
    const { accessToken } = await this.token.signToken(res, payload, platform);
    res.json({ accessToken });
  }

  async googleLogin(
    res: Response,
    req: Request
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const platform = req.headers['user-agent'];
    // dto for credentials or req.user for OAuth
    let data: CheckAccountsType = req.user as OAuthProfileType;
    const user = await this.checkAccounts(data, platform);

    // send tokens to user
    const payload: jwtPayloadInterface = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };
    // we don't send refresh token on login because we don't have it on that stage
    const { accessToken, refreshToken } = await this.token.signToken(
      res,
      payload,
      platform
    );
    return { accessToken, refreshToken };
  }

  async logout(res: Response, req: Request, killDevice: boolean = false) {
    // remove old token and clear cookies
    const platform = req.headers['user-agent'];
    const { payload } = await this.token.verifyToken(req);

    await this.tokendb.removeToken(payload, killDevice, platform);

    res.clearCookie(`refreshToken`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
    res.json({ message: 'You successfully logged out' });
  }
}
