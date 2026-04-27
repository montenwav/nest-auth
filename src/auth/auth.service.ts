import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/CreateUser.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/LoginUser.dto';
import { Response, Request } from 'express';
import { jwtPayloadType, TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';
import { SessionService } from 'src/session/session.service';

@Injectable()
export class AuthService {
  constructor(
    private session: SessionService,
    private token: TokenService,
    private user: UserService
  ) { }

  async register(dto: CreateUserDto) {
    try {
      const hashedPass = await bcrypt.hash(dto.hash, 10);
      const user = await this.user.createUser(dto, hashedPass);
      return user;
    } catch (err) {
      throw new ForbiddenException('Credentials taken');
    }
  }

  async refresh(res: Response, req: Request) {
    const platform = req.headers['user-agent'];

    const { refreshToken, payload } = await this.token.verifyToken(req);
    await this.token.handleTokenReuse(refreshToken, payload);

    // revoke old token and sign new
    const { accessToken } = await this.token.signToken(
      res,
      payload,
      platform,
      refreshToken
    );
    // we use express res instead of return, we need to send response manually
    res.status(201).json({ accessToken });
  }

  async login(res: Response, req: Request, dto: LoginUserDto) {
    const platform = req.headers['user-agent'];
    // user check
    const user = await this.user.getUserByEmail(dto);
    const passCheck = await bcrypt.compare(dto.hash, user.hash);
    if (!passCheck) throw new UnauthorizedException('Password is incorrect');

    if (platform) await this.user.writePlatform(platform, user.id);

    // send tokens to user
    const data: jwtPayloadType = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    // we don't send refresh token on login because we don't have it on that stage
    const { accessToken } = await this.token.signToken(res, data, platform);
    res.json({ accessToken });
  }

  async logout(res: Response, req: Request, killDevice: boolean = false) {
    // remove old token and clear cookies
    const platform = req.headers['user-agent'];
    const { payload } = await this.token.verifyToken(req);

    await this.session.removeToken(payload, platform, killDevice);

    res.clearCookie(`refreshToken`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
    res.json({ message: 'You successfully logged out' });
  }
}
