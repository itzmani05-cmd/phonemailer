import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/** Server-wide setup, shared by main.ts and the e2e tests. */
export function configureApp(app: NestExpressApplication) {
  // Inbound mail payloads (HTML bodies) can exceed the 100kb default.
  app.useBodyParser('json', { limit: '30mb' });
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });
  // Validates DTO classes (e.g. SendEmailDto); plain interface bodies are untouched.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
  return app;
}
