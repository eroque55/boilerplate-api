import { describe, expect, it } from 'vitest';

import { validateEnv } from './env';

const validEnv = {
  DATABASE_URL: 'postgresql://app:app@localhost:5432/app',
  JWT_ACCESS_SECRET: 'a-secret-that-is-at-least-32-characters',
};

describe('validateEnv', () => {
  it('applies defaults and coerces types', () => {
    const env = validateEnv({ ...validEnv, PORT: '4000' });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(env.CORS_ORIGINS).toEqual([]);
  });

  it('splits CORS_ORIGINS on commas', () => {
    const env = validateEnv({
      ...validEnv,
      CORS_ORIGINS: 'http://a.com, http://b.com,',
    });

    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
  });

  it('fails fast listing every invalid variable', () => {
    expect(() => validateEnv({ JWT_ACCESS_SECRET: 'short' })).toThrow(
      /DATABASE_URL[\s\S]*JWT_ACCESS_SECRET/,
    );
  });
});
