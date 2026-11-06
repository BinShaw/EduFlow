import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
    throw new Error(
      'JWT_SECRET must be set to at least 32 bytes in external runtime configuration.',
    );
  }
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
  });
  app.use(express.json({ limit: '64kb', strict: true }));
  app.use(express.urlencoded({ limit: '8kb', extended: true, parameterLimit: 50 }));
  configureApp(app);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`EduFlow API listening on ${port}`);
}
void bootstrap();
