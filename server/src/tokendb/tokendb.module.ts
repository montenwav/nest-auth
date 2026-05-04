import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TokenDBService } from './tokendb.service';

@Module({
  imports: [PrismaModule],
  providers: [TokenDBService],
  exports: [TokenDBService],
})
export class TokenDBModule { }
