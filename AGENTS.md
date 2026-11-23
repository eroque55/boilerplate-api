# Instructions for AI Agents

Project instructions (stack, strict rules, and the documentation router) live in [`CLAUDE.md`](./CLAUDE.md). Read that file before acting on any task.

## This is NOT the NestJS or Prisma you know

NestJS 12 and Prisma 7 changed a lot: Nest packages are ESM-only (this project
loads them from CommonJS through `require(esm)`), validation uses Standard
Schema instead of `class-validator`, and Prisma needs a driver adapter and a
`prisma.config.ts`. Check https://docs.nestjs.com/llms.txt, the Prisma 7 docs
and the installed `.d.ts` files in `node_modules` before assuming an API.
