import 'dotenv/config';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// E2E tests wipe their database, so they never run against the one in
// DATABASE_URL: they use a sibling database with a `_test` suffix.
const toTestDatabaseUrl = (databaseUrl?: string) => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the e2e tests');
  }

  const url = new URL(databaseUrl);
  const name = url.pathname.slice(1);
  url.pathname = `/${name.endsWith('_test') ? name : `${name}_test`}`;

  return url.toString();
};

const databaseUrl = toTestDatabaseUrl(process.env.DATABASE_URL);

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['test/**/*.e2e.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: databaseUrl,
      JWT_ACCESS_SECRET: 'e2e-secret-that-is-at-least-32-characters-long',
    },
  },
});
