import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  const redis = new IORedis(config.getOrThrow('REDIS_URI'));

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  // cookies
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow('CORS_ORIGIN'),
    credentials: true,
  });

  await app.listen(config.getOrThrow('PORT'));
}
bootstrap();
