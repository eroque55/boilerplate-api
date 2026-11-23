import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';
import { PrismaService } from '@/prisma/prisma.service';

export const createTestApp = async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication>({
    logger: false,
  });

  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);

  const clearDatabase = async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  };

  return { app, prisma, clearDatabase };
};
