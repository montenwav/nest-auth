import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TokenDBModule } from 'src/tokendb/tokendb.module';
import { UserModule } from 'src/user/user.module';
import { TokenService } from './token.service';

@Module({
  imports: [TokenDBModule, UserModule, PrismaModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule { }
