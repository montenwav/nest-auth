import { SetMetadata } from '@nestjs/common';
import { Roles } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const RolesDecorator = (...roles: Roles[]) => {
  return SetMetadata(ROLES_KEY, roles);
};
