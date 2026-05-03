import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from '@prisma/client';
import { RolesGuard } from '../guards/roles.guard';
import { RolesDecorator } from '../decorators/roles.decorator';
import { AuthenticateGuard } from '../guards/authenticate.guard';

export function AuthDecorator(...roles: Roles[]) {
  if (roles.length > 0) {
    return applyDecorators(
      RolesDecorator(...roles),
      UseGuards(AuthenticateGuard, RolesGuard)
    );
  }

  return applyDecorators(UseGuards(AuthenticateGuard));
}
