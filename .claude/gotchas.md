# Gotchas

Traps in this project that cost real debugging time. Each one is a decision
already made — do not undo it without reading why.

## Auth

### Every route is private unless marked `@Public()`

`AccessTokenGuard` is a global `APP_GUARD`. Forgetting to protect a route is
the common bug, so the default is protected and opting out is explicit.
`@Roles(Role.ADMIN)` adds a role check on top.

### Refresh tokens rotate and detect reuse

A refresh token is `<uuid>.<secret>`. The database stores only the SHA-256 of
the secret (the secret is 256 random bits, so a slow hash like argon2 adds
nothing). Each token works **once**: `/auth/refresh` revokes it and issues a
new one in the same _family_ (the chain that started at one login).

Presenting a token that was already used means someone else has a copy, so
the whole family is revoked and both the attacker and the user must log in
again. Two requests racing with the same token are treated the same way: the
guarded `updateMany` lets only one win.

Consequence for clients: **refresh must be deduplicated**. The web and Expo
boilerplates already share a single in-flight refresh promise across
concurrent 401s. A client that fires parallel refreshes logs the user out.

### Login does not reveal which e-mails exist

Wrong password and unknown e-mail return the same 401 message, and an unknown
e-mail still runs an argon2 verify against a dummy hash so the response time
matches. Keep both when touching `AuthService.login`.

### Access tokens are stateless

A 15-minute JWT is not checked against the database, so `logout` stops
refresh but an access token already issued lives until it expires. That is
the trade-off of JWTs; keep `JWT_ACCESS_EXPIRES_IN` short.

## Errors

### The filter rewrites framework messages

Nest's router (`Cannot GET /x`), Express's body parser (`Unexpected token…`)
and argument-less exceptions (`new ForbiddenException()` → `Forbidden`) carry
English text. `ProblemDetailsFilter` detects them and uses the pt-BR default
for the status instead. A message you pass yourself is kept as `detail`.

Unexpected errors (anything that is not an `HttpException` or a mapped Prisma
error) become a 500 with a generic `detail` and are logged — their message may
hold internals (SQL, connection strings) and never reaches the client.

### Validation is 422, malformed JSON is 400

400 means the server could not read the request; 422 means it read it and the
data is invalid. Clients show `detail`, and can map `errors[].pointer`
(`#/email`) to form fields.

## Prisma 7

- **The client is generated into `src/generated/prisma`** (gitignored) by
  `postinstall`. After changing `schema.prisma`, run `yarn db:migrate` — it
  regenerates the client too.
- **Driver adapter.** Prisma 7 has no Rust engine; `PrismaService` passes a
  `PrismaPg` adapter. The URL is read from `ConfigService`, not from the schema.
- **`prisma.config.ts` reads `process.env.DATABASE_URL`, not `env()`.**
  `env()` throws when the variable is missing, which broke `yarn install`
  (it runs `prisma generate`) on a fresh clone and in Docker builds.
- **E2E tests use `<db>_test`**, derived from `DATABASE_URL` in
  `vitest.e2e.config.mts`, so they never wipe your development data.
- **`prisma` and `dotenv` are runtime dependencies** on purpose: the Docker
  image runs `prisma migrate deploy` before starting the app.
- **Prisma refuses destructive commands from AI agents** (`migrate reset`,
  `db push --force-reset`) without the user's explicit consent. Ask the user;
  never fake the consent variable.

## Nest 12

- **Nest packages are ESM-only.** This project stays CommonJS (the official
  starter does too) and loads them through `require(esm)`, which needs Node
  22.12+. Don't add `"type": "module"`.
- **Build uses SWC** (`nest-cli.json`), with `typeCheck: true` so `nest build`
  still fails on type errors. Vitest also compiles with SWC (`unplugin-swc`)
  because esbuild does not emit decorator metadata, which DI depends on.
- **`StandardSchemaValidationPipe` is built in.** Don't add `nestjs-zod` or
  `class-validator`: the former does not support Nest 12, the latter would mean
  two validation systems.

## Rate limiting

100 requests/min per IP globally, 5/min on `register` and `login`. Disabled
when `NODE_ENV=test`. `main.ts` sets `trust proxy` to 1 hop so the limiter
sees the client IP behind a load balancer; adjust it if you have more hops.

## Dependencies

Run all verification commands after any bump. Dependabot waits 7 days before
proposing a version (`cooldown`), which protects against a compromised or
broken release published hours earlier.
