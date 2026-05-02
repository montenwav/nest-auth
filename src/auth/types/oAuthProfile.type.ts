import { AuthProviders } from '@prisma/client';

export type OAuthProfileType = {
  email: string;
  isEmailVerified: boolean;
  picture: string;
  fullname: string;
  provider: AuthProviders;
  providerId: string;
};
