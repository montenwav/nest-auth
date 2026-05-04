import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { TokenModule } from 'src/token/token.module';
// import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { recaptchaConfig } from 'src/config/recaptcha.config';
import { GoogleStrategy } from './strategy/google.strategy';
import { PassportModule } from '@nestjs/passport';
import { TokenDBModule } from 'src/tokendb/tokendb.module';

@Module({
  imports: [
    PassportModule,
    // GoogleRecaptchaModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: recaptchaConfig,
    //   inject: [ConfigService],
    // }),
    TokenDBModule,
    UserModule,
    TokenModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
})
export class AuthModule { }
