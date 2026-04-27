import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Roles } from '@prisma/client';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/CreateUser.dto';
import { LoginUserDto } from './dto/LoginUser.dto';
import { AuthGuard } from './guards';
import { RolesGuard } from './guards/roles.guard';
import { Response, Request } from 'express';
import { RolesDecorator } from './roles/roles.decorator';

@RolesDecorator(Roles.USER)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Get('refresh')
  refresh(@Res() res: Response, @Req() req: Request) {
    return this.authService.refresh(res, req);
  }

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Res() res: Response, @Req() req: Request, @Body() dto: LoginUserDto) {
    return this.authService.login(res, req, dto);
  }

  @Get('logout')
  logout(@Res() res: Response, @Req() req: Request) {
    return this.authService.logout(res, req);
  }

  @Get('logout-device')
  logoutDevice(@Res() res: Response, @Req() req: Request) {
    return this.authService.logout(res, req, true);
  }

  @RolesDecorator(Roles.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('user')
  getUser() {
    return `super secret info`;
  }
}
