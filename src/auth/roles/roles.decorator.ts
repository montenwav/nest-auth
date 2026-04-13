import { SetMetadata } from '@nestjs/common';

export enum RolesEnum {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolesEnum[]) => {
  return SetMetadata(ROLES_KEY, roles);
};
