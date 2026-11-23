# Conventions

## Hard rules

Breaking any of these either fails the lint or breaks the app.

### Imports the linter blocks

| Never import                                | Import instead                                      |
| ------------------------------------------- | --------------------------------------------------- |
| `z` from `zod`                              | `@/validation/zod` (configured with pt-BR messages) |
| anything from `@prisma/client`              | `@/generated/prisma/client` (the generated client)  |
| Relative paths 3+ levels deep (`../../../`) | The `@/` alias                                      |

### Types in decorated signatures use `import type`

With `isolatedModules` + `emitDecoratorMetadata`, a type used in a controller
method parameter must be imported with `type`:

```ts
import { LoginSchema, type TLoginInput } from './auth.schemas';
```

`tsc` fails otherwise (TS1272). Classes injected through the constructor are
the opposite: they must be **value** imports, or Nest cannot resolve them.

### Validation lives in the parameter decorator

```ts
@Post('login')
login(@Body({ schema: LoginSchema }) body: TLoginInput) {}

@Get()
list(@Query({ schema: PaginationQuerySchema }) query: TPaginationQuery) {}
```

The global pipe validates against `schema` and returns the parsed value
(coerced, defaults applied). Swagger reads the same schema. Give every schema
that appears in the docs a `.meta({ id: 'Name' })` so it becomes a named
component.

### Errors

Throw Nest's exceptions with a pt-BR message the client can show as-is:

```ts
throw new ConflictException('E-mail já cadastrado');
```

The filter turns it into Problem Details. Without a message, the filter uses a
pt-BR default for the status. Never `res.status().json()` an error by hand.

### Language

Code, comments, commits, test names, docs and file names in **English**.
Portuguese **only** for strings the client shows the user: error `detail`s and
validation messages.

## Style

- Nest classes (modules, controllers, services, guards) are classes — that is
  how DI works. Everything else is an arrow function.
- Types: `type`, not `interface`, prefixed with `T` (`TAuthUser`).
- Files: `name.kind.ts` (`auth.service.ts`, `roles.guard.ts`), as Nest does.
- Imports are auto-grouped and alphabetized by `import-x/order`. Run
  `yarn lint:fix` rather than sorting by hand.
- Don't write explanatory comments that restate the code. Comment only what
  cannot be inferred: a lint rule disabled and why, a security decision, or a
  non-obvious framework constraint.

## Promises

`@typescript-eslint/no-floating-promises` is an error. A fire-and-forget
promise must be marked with `void`.

## Intentionally unused arguments

Prefix with `_` — `no-unused-vars` runs with `argsIgnorePattern: '^_'`.

## Before claiming work is done

```bash
yarn typecheck && yarn lint && yarn format:check && yarn test && yarn test:e2e && yarn build
```
