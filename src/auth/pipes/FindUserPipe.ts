import { PipeTransform, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FindUserPipe implements PipeTransform<any> {
  constructor(private prisma: PrismaService) { }

  async transform(value: string) {
    const id = Number(value);
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }
}
