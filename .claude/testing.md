# Testing

Read this before writing or fixing a test.

## Two suites

| Suite | Command         | Where                   | Database                   |
| ----- | --------------- | ----------------------- | -------------------------- |
| Unit  | `yarn test`     | `src/**/*.test.ts`      | None — dependencies mocked |
| E2E   | `yarn test:e2e` | `test/**/*.e2e.test.ts` | Real Postgres, `<db>_test` |

Unit tests live **next to the code**: `auth.service.ts` → `auth.service.test.ts`.

## What goes where

- **Unit:** pure logic and branches that are awkward to reach over HTTP —
  schemas, the exception filter, a service with its collaborators mocked.
- **E2E:** anything whose correctness depends on the database or the HTTP
  pipeline — guards, validation, status codes, token rotation and reuse
  detection, Prisma queries. Prefer e2e over mocking Prisma: a mocked Prisma
  proves nothing about the query.

## Unit tests

Instantiate the class directly with mocked collaborators. No `TestingModule`
is needed for a service:

```ts
const service = new AuthService(
  usersService as unknown as UsersService,
  tokensService as unknown as TokensService,
);
```

## E2E tests

`createTestApp()` from `test/app.ts` boots the real `AppModule` with the same
setup as `main.ts` (`configureApp`) and returns `clearDatabase()`. Call it in
`beforeEach` — every test starts from an empty database.

```ts
beforeAll(async () => {
  ({ app, clearDatabase } = await createTestApp());
});
beforeEach(() => clearDatabase());
afterAll(() => app.close());
```

When you add a model, add it to `clearDatabase` (children before parents).

`test/global-setup.ts` runs `prisma migrate deploy` against `<db>_test` once
before the suite. It creates the database if needed and never drops data.
Files run sequentially (`fileParallelism: false`) because they share it.

Rate limiting is off in tests (`NODE_ENV=test`).

## Running locally

```bash
yarn db:up      # Postgres must be running
yarn test:e2e
```
