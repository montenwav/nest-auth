import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  Delete,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/LoginUser.dto';
import type { Response, Request } from 'express';
import { RolesDecorator } from './decorators/roles.decorator';
import { RegisterUserDto } from './dto/RegisterUser.dto';
import { AuthDecorator } from './decorators/auth.decorator';
import { UserService } from '../user/user.service';
import { Recaptcha } from '@nestlab/google-recaptcha';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticateGuard } from '../auth/guards/authenticate.guard';
import { ConfigService } from '@nestjs/config';

@RolesDecorator(Roles.USER)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly user: UserService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Get('refresh')
  refresh(@Res() res: Response, @Req() req: Request) {
    return this.authService.refresh(res, req);
  }

  @Recaptcha()
  @Post('register')
  register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Recaptcha()
  @Post('login')
  login(@Res() res: Response, @Req() req: Request, @Body() dto: LoginUserDto) {
    return this.authService.login(res, req, dto);
  }

  @Delete('logout')
  logout(@Res() res: Response, @Req() req: Request) {
    return this.authService.logout(res, req);
  }

  @Delete('logout-device')
  logoutDevice(@Res() res: Response, @Req() req: Request) {
    return this.authService.logout(res, req, true);
  }

  // user goes on auth/google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() { }

  // google redirects you here after consent
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Res() res: Response, @Req() req: Request) {
    await this.authService.googleLogin(res, req);
    return res.redirect(`${this.configService.get('CORS_ORIGIN')}`);
  }

  @UseGuards(AuthenticateGuard)
  @Get('user')
  getUser(@Req() req: any) {
    if (req.user.sub) return this.user.getUserById(req.user.sub);
    throw new UnauthorizedException('User not found');
  }
}
