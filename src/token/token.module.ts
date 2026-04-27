import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { TokenService } from './token.service';
import { SessionModule } from 'src/session/session.module';

@Module({
  imports: [SessionModule, UserModule, PrismaModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule { }
