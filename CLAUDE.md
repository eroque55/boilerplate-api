@AGENTS.md
@.claude/architecture.md
@.claude/conventions.md

# Project

NestJS API boilerplate. Every backend starts from a clone of this, so a mistake
here is copied into every project — prefer the correct fix over the quick one.

**Stack:** Node 24 · NestJS 12 (Express) · Prisma 7 + PostgreSQL 18 ·
Zod 4 (Standard Schema validation + OpenAPI) · JWT access tokens + rotating
refresh tokens · argon2 · pino · Vitest 5 + Supertest

## Commands

```bash
yarn db:up          # start Postgres (docker compose)
yarn db:migrate     # create/apply a migration in development
yarn db:seed        # create the first admin
yarn dev            # dev server with watch (http://localhost:3333, docs at /docs)
yarn build          # nest build (SWC + type check)
yarn typecheck      # tsc --noEmit
yarn lint           # ESLint
yarn lint:fix
yarn format         # Prettier
yarn test           # unit tests (Vitest)
yarn test:e2e       # e2e tests against a real Postgres (<db>_test)
```

## Read before acting

These carry decisions already made. Read the relevant file **before** writing
code in that area, not after something breaks.

| Before you                                         | Read                 |
| -------------------------------------------------- | -------------------- |
| Write or change any test                           | `.claude/testing.md` |
| Touch auth, tokens, guards or the refresh rotation | `.claude/gotchas.md` |
| Touch error handling or the response shape         | `.claude/gotchas.md` |
| Change `schema.prisma` or anything Prisma          | `.claude/gotchas.md` |
| Add, remove or bump a dependency                   | `.claude/gotchas.md` |
| Write a commit message or open a PR                | `CONTRIBUTING.md`    |

## Non-negotiables

1. **Verify before claiming.** Run `yarn typecheck`, `yarn lint`, `yarn test`,
   `yarn test:e2e` and `yarn build`, and report the real exit codes. Never
   state that something passes without having run it.
2. **Every error is RFC 9457 Problem Details.** Throw Nest's `HttpException`
   subclasses with a pt-BR message; never build an error response by hand.
3. **Routes are private by default.** Opt out with `@Public()`, deliberately.
4. **Never return `passwordHash`.** Read users through `publicUserSelect`.
5. **English in code, Portuguese only in strings the client shows the user**
   (error `detail`, validation messages).
6. **Don't silence a lint rule to make a diff look clean.** If a rule is wrong,
   say why and disable it deliberately with the reason recorded.

## State of the repo

All verification commands (`typecheck`, `lint`, `format:check`, `test`,
`test:e2e`, `build`) are green. Keep them that way.

`yarn lint` exits 0 with **0 warnings**. Any warning means your change
introduced it — fix the underlying cause rather than silencing the rule.
