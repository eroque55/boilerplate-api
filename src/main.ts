import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { setupSwagger } from './config/swagger.config';

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  // Behind one reverse proxy (load balancer, PaaS router): trust its
  // X-Forwarded-For so rate limiting sees the client IP, not the proxy's.
  app.set('trust proxy', 1);

  const config = configureApp(app);

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    setupSwagger(app);
  }

  await app.listen(config.get('PORT', { infer: true }));
};

void bootstrap();
