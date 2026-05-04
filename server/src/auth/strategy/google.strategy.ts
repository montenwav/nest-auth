import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-google-oauth20';
import { OAuthProfileType } from '../types/oAuthProfile.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  // get user data from google after consent
  async validate(
    accessToken: string,
    refreshToken: string,
    payload: any
  ): Promise<OAuthProfileType> {
    return {
      email: payload.emails[0].value,
      isEmailVerified: payload.emails[0].verified,
      picture: payload.photos[0].value,
      fullname: payload.displayName,
      provider: payload.provider.toUpperCase(),
      providerId: payload.id,
    };
  }
}
