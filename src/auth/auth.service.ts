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

@Injectable()
export class AuthService {
  constructor(private token: TokenService, private user: UserService) { }

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
    const { refreshToken, payload } = await this.token.verifyToken(req);
    // revoke old token and sign new
    const { accessToken } = await this.token.signToken(
      res,
      payload,
      refreshToken
    );
    return { accessToken };
  }

  async login(res: Response, dto: LoginUserDto) {
    // user check
    const user = await this.user.getUserByEmail(dto);
    const passCheck = await bcrypt.compare(dto.hash, user.hash);
    if (!passCheck) throw new UnauthorizedException('Password is incorrect');

    // send tokens
    const data: jwtPayloadType = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const { accessToken } = await this.token.signToken(res, data);
    return { accessToken };
  }

  async logout(res: Response, req: Request) {
    // remove old token and clear cookies
    const { refreshToken, payload } = await this.token.verifyToken(req);
    await this.token.removeToken(res, refreshToken, payload.sub);

    res.clearCookie(`refreshToken`, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
  }
}
