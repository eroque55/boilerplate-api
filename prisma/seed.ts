import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

import { PrismaClient } from '@/generated/prisma/client';
import z, { password } from '@/validation/zod';

const SeedEnvSchema = z.object({
  DATABASE_URL: z.url(),
  SEED_ADMIN_EMAIL: z.email(),
  SEED_ADMIN_PASSWORD: password,
});

const seed = async () => {
  const env = SeedEnvSchema.parse(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

  try {
    const admin = await prisma.user.upsert({
      where: { email: env.SEED_ADMIN_EMAIL },
      update: {},
      create: {
        name: 'Admin',
        email: env.SEED_ADMIN_EMAIL,
        role: 'ADMIN',
        passwordHash: await argon2.hash(env.SEED_ADMIN_PASSWORD),
      },
    });

    console.log(`Seeded admin: ${admin.email}`);
  } finally {
    await prisma.$disconnect();
  }
};

void seed();
