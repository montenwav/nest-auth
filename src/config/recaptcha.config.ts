import { ConfigService } from '@nestjs/config';

export async function recaptchaConfig(configService: ConfigService) {
  return {
    secretKey: configService.get<string>('GOOGLE_RECAPTCHA_SECRET') || '',
    response: (req: any) => req.headers.recaptcha,
    skipIf: configService.get<string>('NODE_ENV') !== 'production',
  };
}
