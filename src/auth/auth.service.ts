import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/CreateUser.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/LoginUser.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) { }

  async register(dto: CreateUserDto) {
    try {
      const hashedPass = await bcrypt.hash(dto.hash, 10);

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash: hashedPass,
        },
      });

      delete user.hash;

      return user;
    } catch (err) {
      throw new ForbiddenException('Credentials taken');
    }
  }

  async login(dto: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('user not found');
    }

    const passCheck = await bcrypt.compare(dto.hash, user.hash);
    if (!passCheck) {
      return 'password is incorrect';
    }

    return this.signToken(user.id, user.email);
  }

  async signToken(id: number, email: string): Promise<{ token: string }> {
    const data = {
      sub: id,
      email,
    };

    const jwtToken = await this.jwt.signAsync(data, {
      expiresIn: '15m',
      secret: process.env.JWT_SECRET,
    });

    return { token: jwtToken };
  }
}
