import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '@/prisma/prisma.service';

import { createTestApp } from './app';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clearDatabase: () => Promise<void>;

  const http = () => request(app.getHttpServer());

  const loginAs = async (role: 'USER' | 'ADMIN') => {
    const email = `${role.toLowerCase()}@example.com`;

    await prisma.user.create({
      data: {
        name: role,
        email,
        role,
        passwordHash: await argon2.hash('Senha@123'),
      },
    });

    const { body } = await http()
      .post('/v1/auth/login')
      .send({ email, password: 'Senha@123' })
      .expect(200);

    return (body as { accessToken: string }).accessToken;
  };

  beforeAll(async () => {
    ({ app, prisma, clearDatabase } = await createTestApp());
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  it('forbids the user list to non-admins', async () => {
    const token = await loginAs('USER');

    await http()
      .get('/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.detail).toBe(
          'Você não tem permissão para acessar este recurso',
        );
      });
  });

  it('lists users paginated for admins', async () => {
    const token = await loginAs('ADMIN');
    await loginAs('USER');

    await http()
      .get('/v1/users?page=1&pageSize=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).not.toHaveProperty('passwordHash');
        expect(body.meta).toEqual({
          page: 1,
          pageSize: 1,
          pageCount: 2,
          total: 2,
        });
      });
  });

  it('validates query parameters', async () => {
    const token = await loginAs('ADMIN');

    await http()
      .get('/v1/users?pageSize=500')
      .set('Authorization', `Bearer ${token}`)
      .expect(422)
      .expect(({ body }) => {
        expect(body.errors[0].pointer).toBe('#/pageSize');
      });
  });
});
