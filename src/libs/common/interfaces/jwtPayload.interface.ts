import { Roles } from '@prisma/client';

export interface jwtPayloadInterface {
  sub: number;
  email: string;
  roles: Roles[];
  jti?: string;
  exp?: string;
  iat?: string;
}
