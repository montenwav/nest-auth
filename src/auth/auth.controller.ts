import { Body, Controller, Get, Post, UseGuards, Param } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/CreateUser.dto';
import { LoginUserDto } from './dto/LoginUser.dto';
import { FindUserPipe } from './pipes/FindUserPipe';
import { Roles, RolesEnum } from './roles/roles.decorator';
import { AuthGuard } from './guards';
import { RolesGuard } from './guards/roles.guard';

@Roles(RolesEnum.USER)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginUserDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @Get('user')
  getUser() {
    return `super secret info`;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @Get('find/:id')
  findUser(@Param('id', FindUserPipe) user: User) {
    return user;
  }
}
