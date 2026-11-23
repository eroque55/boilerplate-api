import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { createTestApp } from './app';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports liveness without a version prefix', async () => {
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200, { status: 'ok' });
  });

  it('reports the database as up', async () => {
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('answers unknown routes as problem details', async () => {
    await request(app.getHttpServer())
      .get('/v1/nope')
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);
  });
});
