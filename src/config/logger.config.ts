import { randomUUID } from 'node:crypto';

import type { Params } from 'nestjs-pino';

import { Env } from '@/env';

export const createLoggerConfig = (
  env: Pick<Env, 'NODE_ENV' | 'LOG_LEVEL'>,
): Params => ({
  pinoHttp: {
    level: env.LOG_LEVEL,
    genReqId: (request, response) => {
      const header = request.headers['x-request-id'];
      const id = typeof header === 'string' && header ? header : randomUUID();
      response.setHeader('X-Request-Id', id);
      return id;
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
    autoLogging: {
      ignore: request => request.url?.startsWith('/health') ?? false,
    },
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { singleLine: true } }
        : undefined,
  },
});
