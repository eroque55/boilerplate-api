import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from './app';

const credentials = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'Senha@123',
};

type TSession = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string };
};

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let clearDatabase: () => Promise<void>;

  const http = () => request(app.getHttpServer());

  const register = async () => {
    const response = await http()
      .post('/v1/auth/register')
      .send(credentials)
      .expect(201);
    return response.body as TSession;
  };

  beforeAll(async () => {
    ({ app, clearDatabase } = await createTestApp());
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in and reads the profile', async () => {
    const registered = await register();
    expect(registered.user).toMatchObject({
      email: 'ana@example.com',
      role: 'USER',
    });
    expect(registered.user).not.toHaveProperty('passwordHash');

    const { body: session } = await http()
      .post('/v1/auth/login')
      .send({ email: 'ANA@example.com', password: credentials.password })
      .expect(200);

    await http()
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${(session as TSession).accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: registered.user.id, name: 'Ana' });
      });
  });

  it('answers validation errors as RFC 9457 problem details', async () => {
    const response = await http()
      .post('/v1/auth/register')
      .send({ name: '', email: 'invalid', password: 'Senha@123' })
      .expect(422)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Dados inválidos',
      instance: '/v1/auth/register',
      errors: [
        { pointer: '#/name', detail: 'Campo obrigatório' },
        { pointer: '#/email', detail: 'E-mail inválido' },
      ],
    });
  });

  it('rejects a duplicated e-mail with 409', async () => {
    await register();

    await http()
      .post('/v1/auth/register')
      .send(credentials)
      .expect(409)
      .expect(({ body }) => {
        expect(body.detail).toBe('E-mail já cadastrado');
      });
  });

  it('rejects wrong credentials with 401', async () => {
    await register();

    await http()
      .post('/v1/auth/login')
      .send({ email: credentials.email, password: 'Errada@123' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.detail).toBe('E-mail ou senha inválidos');
      });
  });

  it('protects routes by default', async () => {
    await http().get('/v1/users/me').expect(401);
    await http()
      .get('/v1/users/me')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
  });

  it('rotates refresh tokens: each one works once', async () => {
    const { refreshToken } = await register();

    const { body: rotated } = await http()
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect((rotated as TSession).refreshToken).not.toBe(refreshToken);

    await http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: (rotated as TSession).refreshToken })
      .expect(200);
  });

  it('revokes the whole session when a spent refresh token is reused', async () => {
    const { refreshToken: stolen } = await register();

    const { body: legit } = await http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: stolen })
      .expect(200);

    await http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: stolen })
      .expect(401);

    await http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: (legit as TSession).refreshToken })
      .expect(401);
  });

  it('rejects a malformed refresh token without a server error', async () => {
    await http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: 'garbage.token' })
      .expect(401);
  });

  it('logs out a single session', async () => {
    const { refreshToken } = await register();

    await http().post('/v1/auth/logout').send({ refreshToken }).expect(204);
    await http().post('/v1/auth/refresh').send({ refreshToken }).expect(401);
  });

  it('logs out every session of the user', async () => {
    const first = await register();
    const { body: second } = await http()
      .post('/v1/auth/login')
      .send(credentials)
      .expect(200);

    await http()
      .post('/v1/auth/logout-all')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(204);

    for (const { refreshToken } of [first, second as TSession]) {
      // eslint-disable-next-line no-await-in-loop -- sequential on purpose: each call must see the revocation
      await http().post('/v1/auth/refresh').send({ refreshToken }).expect(401);
    }
  });
});
