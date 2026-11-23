# Architecture

## Folder map

```
prisma/
  schema.prisma       Database schema (source of truth for tables)
  migrations/         SQL migrations, committed. Never edit an applied one.
  seed.ts             Creates the first admin (`yarn db:seed`)
src/
  main.ts             Bootstrap: logger, trust proxy, Swagger, listen
  app.setup.ts        helmet, CORS, versioning, shutdown hooks. Shared with e2e.
  app.module.ts       Root module + global pipe, filter and guards
  env.ts              Fail-fast environment validation (Zod)
  common/             Cross-cutting pieces with no domain knowledge
    exceptions/       ValidationException (422 with field errors)
    filters/          ProblemDetailsFilter (every error → RFC 9457)
    pipes/            Global Standard Schema validation pipe
    schemas/          Pagination + ProblemDetails schemas
  config/             Logger and Swagger setup
  constants/          App metadata
  generated/prisma/   Generated Prisma client. Gitignored, never edited.
  modules/            One folder per domain (feature module)
    auth/             Register, login, refresh, logout + guards/decorators
    users/            /users/me and the admin user list
    health/           Liveness and readiness probes
  prisma/             PrismaService (the client, injectable) + global module
  utils/              Pure helpers. No Nest, no Prisma.
  validation/         Zod configured with pt-BR messages
test/                 E2E tests + helpers (real HTTP, real Postgres)
```

## Layering

Dependencies point **downward only**:

```
controller  →  service  →  PrismaService
     ↘ schemas (Zod)  ↙
```

- **Controllers** handle HTTP only: route, status code, validation schema,
  OpenAPI decorators. No business rules, no Prisma.
- **Services** hold the business rules and talk to Prisma. They throw
  `HttpException` subclasses with pt-BR messages.
- **Schemas** (`*.schemas.ts`) are Zod objects. They validate input **and**
  generate the OpenAPI document; a TypeScript type is inferred from each.
- A module uses another module's service only through that module's
  `exports`, never by importing its file into its own `providers`.

`import-x/no-cycle` is an ESLint **error**. `common/` and `utils/` never import
from `modules/`.

## Request lifecycle

```
helmet/CORS → pino-http (request id) → ThrottlerGuard → AccessTokenGuard
  → RolesGuard → validation pipe → controller → service
  → (any exception) → ProblemDetailsFilter
```

The guards, pipe and filter are registered once in `app.module.ts` as
`APP_GUARD`/`APP_PIPE`/`APP_FILTER`. Guards run in the order listed there.

## API conventions

| Topic          | Rule                                                                 |
| -------------- | -------------------------------------------------------------------- |
| Versioning     | URI: `/v1/...` (default). Health is version-neutral (`/health/...`). |
| Naming         | Plural nouns (`/users`), `me` for the current user, camelCase JSON   |
| IDs            | UUID v7 (time-ordered, safe to expose)                               |
| Dates          | ISO 8601 strings in UTC                                              |
| Validation     | 422 with `errors: [{ pointer, detail }]`                             |
| Errors         | RFC 9457 `application/problem+json`                                  |
| Lists          | `{ data: [], meta: { page, pageSize, pageCount, total } }`           |
| Single objects | Returned as-is, no envelope                                          |
| Auth           | `Authorization: Bearer <accessToken>`                                |
| Docs           | Swagger UI at `/docs`, JSON at `/docs/openapi.json` (not in prod)    |

## Where to add things

| Adding                       | Goes in                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| A domain (e.g. orders)       | `src/modules/orders/` with module, controller, service, schemas |
| An endpoint                  | Controller method + Zod schema in the module's `*.schemas.ts`   |
| A table or column            | `prisma/schema.prisma`, then `yarn db:migrate --name <change>`  |
| An env variable              | `src/env.ts` **and** `.env.example`                             |
| A cross-cutting guard/filter | `src/common/`, registered in `app.module.ts`                    |
| A pure helper                | `src/utils/`                                                    |

`nest g resource orders` scaffolds a module, but it writes `class-validator`
DTOs. Replace them with Zod schemas before committing.
