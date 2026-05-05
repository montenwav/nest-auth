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
import { OAuthProfileType } from './types/oAuthProfile.type';
import { CreateUserType } from './types/createUser.type';
import { CheckAccountsType } from './types/checkAccounts.type';
import { TokenDBService } from 'src/tokendb/tokendb.service';
import { Account } from '@prisma/client';

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

  async login(res: Response, req: Request, dto: LoginUserDto) {
    const platform = req.headers['user-agent'];
    const data = {
      provider: 'CREDENTIALS', // OAuth provider or Credentials login
      providerId: dto.email, // OAuth providerId or email for Credentials
    };

    let user: any = await this.user.getUserByEmail(dto.email);
    if (!user)
      throw new UnauthorizedException('User not found, please sign up');

    if (!user.hash) throw new UnauthorizedException('Use Google sign in');

    if (user.hash && dto.password) {
      const passCheck = await bcrypt.compare(dto.password, user.hash);
      if (!passCheck) throw new UnauthorizedException('Password is incorrect');
    }

    await this.user.updateUser(data as OAuthProfileType, platform);

    const payload: jwtPayloadInterface = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const { accessToken } = await this.token.signToken(res, payload, platform);
    res.json({ accessToken });
  }

  async googleLogin(res: Response, req: Request) {
    const platform = req.headers['user-agent'];
    let data: CheckAccountsType = req.user as OAuthProfileType;
    let user: any | null = null;
    // If account doesn't exist we search for user by email
    // If user doesn't exist we create a new user with linked account
    let account: any = await this.user.getAccountByProviderId(
      data.provider,
      data.providerId
    );
    if (account) user = account.user;

    user = await this.user.getUserByEmail(data.email);
    if (!user) await this.user.createUser(data as CreateUserType);
    // If user exists but doesn't have account with such provider,
    // we create new account for that user
    if (
      user.accounts.some((acc: Account) => {
        acc.provider != (data as OAuthProfileType).provider;
      })
    ) {
      await this.user.createAccount(data, account.userId);
    }
    await this.user.updateUser(data as OAuthProfileType, platform);

    // send tokens to user
    const payload: jwtPayloadInterface = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };
    await this.token.signRefreshToken(res, payload, platform);
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
