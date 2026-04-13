import { NestMiddleware } from '@nestjs/common';
import { Response, Request, NextFunction } from 'express';

export class LoggerMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    console.log('logging message');

    next();
  }
}
