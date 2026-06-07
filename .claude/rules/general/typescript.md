---
# ALWAYS ACTIVE — no paths filter. TypeScript conventions for the whole repo.
description: TypeScript strict-mode conventions and module discipline.
---

# TypeScript Conventions (always active)

Complements [code-quality](./code-quality.md). This file owns TS-specific mechanics; that file owns general quality.

## Strict mode

- `strict: true` is mandatory in `tsconfig.json`. Do not relax individual flags to make code compile.
- Keep `noUncheckedIndexedAccess`, `noImplicitOverride`, and `exactOptionalPropertyTypes` on. Handle the `undefined` they surface; do not assert it away.
- Target ESM. Use `import type` for type-only imports so they erase at build.

## Modeling

- Model domain entities as `interface` or `type` matching [domain-model](../../core-context/domain-model.md) exactly. Field names and shapes MUST agree with that file.
- Use discriminated unions for variant data; do not use loose optional flags that allow impossible states.
- Use `readonly` on entity fields and on arrays returned from services.
- Derive types from Zod schemas with `z.infer` so the validated input type and runtime check share ONE source. Schemas live in `lib/validation`. See [api/route-handlers](../api/route-handlers.md) and [mcp/tool-conventions](../mcp/tool-conventions.md).

## Functions

- Explicit parameter and return types on all exported functions.
- Prefer pure functions. Side effects (store mutation) are isolated to the store module only.
- No default exports for modules with multiple symbols; named exports only.

## Errors as types

- Domain errors are distinct classes extending a shared base, each carrying a stable discriminator the mapper switches on. Definitions and HTTP mapping: [domain-model](../../core-context/domain-model.md).
- Never type-cast a caught error to a domain error. Use `instanceof` checks.

## Null & optional

- Distinguish "missing" (`undefined`) from "empty". `description` may be an empty string; it is never `undefined` once an event exists.
- `find*` functions may return `undefined`; `get*` functions throw NotFound. Match this prefix contract from [domain-model](../../core-context/domain-model.md).

## Dates

- All datetimes are ISO-8601 UTC strings at the boundary; parse to `Date` only for comparison. Past-event check compares against server `now`. See [assumptions](../../../docs/assumptions.md).

## Don't

- No `enum`; use union string literals.
- No namespace; use ES modules.
- No `require`; ESM imports only.
