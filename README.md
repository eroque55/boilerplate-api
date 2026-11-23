# NestJS API Boilerplate

An opinionated NestJS API template with batteries included: authentication with
rotating refresh tokens and reuse detection, RFC 9457 error responses in pt-BR,
validation and OpenAPI docs from the same Zod schemas, structured logs, health
checks, and tests against a real database.

It is the backend companion of the
[Next.js](https://github.com/eroque55/boilerplate-web) and
[Expo](https://github.com/eroque55/boilerplate-expo) boilerplates and shares
their tooling and conventions.

## Stack

|                                   |                                                       |
| --------------------------------- | ----------------------------------------------------- |
| **NestJS 12** · Express           | Modules, dependency injection, guards, pipes, filters |
| **TypeScript 6**                  | Strict mode, compiled with SWC                        |
| **Prisma 7** + **PostgreSQL 18**  | Typed ORM, SQL migrations, `pg` driver adapter        |
| **Zod 4**                         | Request validation + OpenAPI, pt-BR messages          |
| **JWT** + rotating refresh tokens | argon2id passwords, reuse detection                   |
| **Swagger UI**                    | Generated from the Zod schemas at `/docs`             |
| **pino**                          | JSON logs with request ids, secrets redacted          |
| **helmet** · CORS · **throttler** | Security headers, origin allowlist, rate limiting     |
| **Vitest 5** + **Supertest**      | Unit and e2e tests                                    |

## Get started

Requirements: Node 24 (see `.nvmrc`), Yarn 1 and Docker.

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies (also generates the Prisma client):

   ```bash
   yarn install
   ```

3. Start Postgres, apply the migrations and create the first admin:

   ```bash
   yarn db:up
   yarn db:migrate
   yarn db:seed
   ```

4. Start the API:

   ```bash
   yarn dev
   ```

   The API answers on [http://localhost:3333](http://localhost:3333) and the
   interactive docs live at [http://localhost:3333/docs](http://localhost:3333/docs).
   Log in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`.

## First things to change

1. Replace `changeme` in `package.json` (`name`) and `src/constants/app.ts`.
2. Generate a real `JWT_ACCESS_SECRET`: `openssl rand -base64 48`.
3. Set `CORS_ORIGINS` to the URLs of your frontends.

## Endpoints

| Method | Path                  | Auth   | Description                                 |
| ------ | --------------------- | ------ | ------------------------------------------- |
| POST   | `/v1/auth/register`   | —      | Create an account and start a session       |
| POST   | `/v1/auth/login`      | —      | Start a session with e-mail and password    |
| POST   | `/v1/auth/refresh`    | —      | Exchange a refresh token for a new pair     |
| POST   | `/v1/auth/logout`     | —      | End the session of a refresh token          |
| POST   | `/v1/auth/logout-all` | Bearer | End every session of the current user       |
| GET    | `/v1/users/me`        | Bearer | The current user                            |
| GET    | `/v1/users`           | Admin  | Paginated user list (`?page=1&pageSize=20`) |
| GET    | `/health/live`        | —      | Liveness probe                              |
| GET    | `/health/ready`       | —      | Readiness probe (checks the database)       |

A session looks like this:

```json
{
  "accessToken": "eyJhbGciOi…",
  "refreshToken": "0193…-…-….kF3x…",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "0193…",
    "name": "Ana",
    "email": "ana@example.com",
    "role": "USER"
  }
}
```

Send the access token as `Authorization: Bearer <accessToken>`. When it expires
(401), call `/v1/auth/refresh` with the refresh token. **Each refresh token works
once**: store the new one you get back. Reusing an old one revokes the session.

## Errors

Every error follows [RFC 9457 (Problem Details)](https://www.rfc-editor.org/rfc/rfc9457)
with `Content-Type: application/problem+json`. `detail` is in Portuguese and safe
to show the user:

```json
{
  "type": "about:blank",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Dados inválidos",
  "instance": "/v1/auth/register",
  "errors": [{ "pointer": "#/email", "detail": "E-mail inválido" }]
}
```

`errors` appears only on validation failures (422) and maps each message to the
field it belongs to.

## Project structure

```
prisma/             Schema, migrations and seed
src/
  main.ts           Bootstrap
  app.module.ts     Root module + global guards, pipe and filter
  env.ts            Environment validation (fails fast on startup)
  common/           Problem Details filter, validation pipe, shared schemas
  config/           Logger and Swagger setup
  modules/
    auth/           Register, login, refresh, logout, guards and decorators
    users/          Current user and admin user list
    health/         Liveness and readiness
  prisma/           PrismaService
  validation/       Zod with pt-BR messages
test/               E2E tests
```

Each module follows the same shape: the **controller** handles HTTP, the
**service** holds the business rules and talks to the database, and the
**schemas** validate input and document the API.

## Conventions

**Enforced by ESLint** (these fail the lint, they are not suggestions):

- Import `z` from `@/validation/zod`, never from `zod`
- Import the database client from `@/generated/prisma/client`, never `@prisma/client`
- No relative imports deeper than two levels; use the `@/` alias
- No circular dependencies (`import-x/no-cycle`)
- Imports are grouped and alphabetized automatically

**By agreement:**

- Routes are private by default; mark public ones with `@Public()`.
- Throw Nest exceptions with a pt-BR message; the filter formats the response.
- Code, comments, tests and docs in English. Portuguese only for messages the client shows.
- Prefer `type` over `interface`.

## Testing

```bash
yarn test              # unit tests
yarn test:e2e          # e2e tests (needs `yarn db:up`)
yarn test:coverage     # V8 coverage report in coverage/
```

E2E tests run against a separate `<database>_test` database, so they never
touch your development data.

## Database workflow

```bash
# after editing prisma/schema.prisma
yarn db:migrate --name add_orders   # creates and applies a migration
yarn db:studio                      # browse the data
```

Commit the generated folder in `prisma/migrations/`. In production, migrations
run with `yarn db:deploy` (the Docker image does it on start).

## Deploy

```bash
docker build -t changeme-api .
docker run -p 3333:3333 --env-file .env changeme-api
```

The image applies pending migrations and starts the API. Swagger is disabled
when `NODE_ENV=production`.

## Useful commands

```bash
yarn dev            # start with watch
yarn build          # production build (dist/)
yarn start          # run the build
yarn typecheck      # tsc --noEmit
yarn lint           # ESLint (0 warnings)
yarn lint:fix       # ESLint with --fix
yarn format         # Prettier over the whole project
yarn db:up          # start Postgres
yarn db:down        # stop Postgres
```

## Author

Built and maintained by **Eduardo Roque** — [@eroque55](https://github.com/eroque55).
