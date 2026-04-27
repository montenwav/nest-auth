import {
  Injectable,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { CreateUserDto } from 'src/auth/dto/CreateUser.dto';
import { LoginUserDto } from 'src/auth/dto/LoginUser.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async getUserById(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new HttpException('User not found', 404);
    return user;
  }

  async getUserByEmail(dto: LoginUserDto): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user)
      throw new UnauthorizedException(`User with email ${dto.email} not found`);
    return user;
  }

  async createUser(dto: CreateUserDto, hash: string): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        hash,
        platforms: [],
      },
    });
    if (!user)
      throw new UnauthorizedException(`User with email ${dto.email} not found`);
    return user;
  }

  async writePlatform(platform: string, id: number) {
    // get platform and rewrite platforms field in DB
    const platformsObj = await this.prisma.user.findUnique({
      where: { id },
      select: { platforms: true },
    });
    const platforms = platformsObj?.platforms;

    if (platforms && !platforms.includes(platform)) {
      platformsObj.platforms.push(platform);
      await this.prisma.user.update({
        where: { id },
        data: { platforms },
      });
    }
  }
}
