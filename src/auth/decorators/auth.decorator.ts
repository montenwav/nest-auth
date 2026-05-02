import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from '@prisma/client';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { RolesDecorator } from '../decorators/roles.decorator';

export function AuthDecorator(...roles: Roles[]) {
  if (roles.length > 0) {
    return applyDecorators(
      RolesDecorator(...roles),
      UseGuards(AuthGuard, RolesGuard)
    );
  }

  return applyDecorators(UseGuards(AuthGuard));
}
