import {
  Injectable,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { Account, AuthProviders, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserType } from 'src/auth/types/createUser.type';
import { OAuthProfileType } from 'src/auth/types/oAuthProfile.type';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async getUserById(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { accounts: true },
    });
    if (!user) throw new HttpException('User not found', 404);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });
    return user ?? null;
  }

  async getAccountByProviderId(
    provider: string,
    providerId: string
  ): Promise<Account | null> {
    let account = await this.prisma.account.findFirst({
      where: { AND: [{ provider }, { providerId }] },
      include: { user: true },
    });
    return account ?? null;
  }

  async createUser(dto: CreateUserType): Promise<User> {
    let hash: string | null = null;
    if (dto.password) {
      hash = await bcrypt.hash(dto.password, 10);
    }
    // Because we don't have password in OAuth
    const accountType = {
      provider: dto.password ? 'CREDENTIALS' : dto.provider,
      providerId: dto.password ? dto.email : dto.providerId,
    };

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        hash,
        picture: dto.picture,
        isVerified: dto.isEmailVerified,
        fullname: dto.fullname,
        accounts: {
          create: [accountType],
        },
        methods: [dto.provider || AuthProviders.CREDENTIALS],
      },
      include: { accounts: true },
    });
    return user;
  }

  async createAccount(profile: any, userId: number) {
    await this.prisma.account.create({
      data: {
        provider: profile.provider,
        providerId: profile.providerId,
        userId,
      },
    });
  }

  async updateUser(data: OAuthProfileType, platform?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email || data.providerId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    data.provider = data.provider ? data.provider : 'CREDENTIALS';
    const isVerified = user.isVerified ? true : data.isEmailVerified ?? false;

    const methods: AuthProviders[] = Array.from(
      new Set([...user.methods, data.provider])
    );

    const platforms: string[] = platform
      ? Array.from(new Set([...user.platforms, platform]))
      : user.platforms;

    await this.prisma.user.update({
      where: { email: user.email },
      data: {
        isVerified,
        picture: data.picture || null,
        methods,
        platforms,
      },
    });
  }
}
