import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
