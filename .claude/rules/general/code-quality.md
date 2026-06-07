---
# ALWAYS ACTIVE — no paths filter. Applies to every file in the repo.
description: Baseline code-quality rules. Non-negotiable across the whole repo.
---

# Code Quality (always active)

These are hard rules. Violations fail review.

## Types

- Strictly type everything. Declare explicit types on exported signatures.
- NEVER use `any`. Use `unknown` at boundaries, then narrow.
- NEVER use `var`. Use `const` by default; `let` only when reassignment is required.
- Give every exported function an explicit return type. No inferred public return types.
- No non-null assertions (`!`) to silence the compiler. Narrow instead.

## Structure

- NEVER define a class or function type inside a method/function body. Declare at module scope.
- Prefer plain functions and modules over classes. Domain services are module functions, not class hierarchies. See [service-layer-purity](../domain/service-layer-purity.md).
- One concern per module. Keep files focused and small.

## Imports

- NEVER use wildcard imports (`import * as x` for local modules, barrel star re-exports). Import named symbols explicitly.
- Import domain errors and types from their canonical modules, not via re-export chains.
- Order: external packages, then internal modules. No deep relative reaches across layers that violate dependency direction (see [architecture](../../../docs/architecture.md)).

## Immutability

- Immutability-first. Treat domain entities as read-only once created.
- NEVER mutate function arguments. Return new values.
- Derived fields (`registrationCount`, `availableCapacity`) are computed, never stored as mutable truth. See [domain-model](../../core-context/domain-model.md).
- Prefer `readonly` arrays/properties and `as const` where it sharpens types.

## Errors

- Throw typed domain errors, never bare strings or generic `Error`, for business-rule failures. Taxonomy in [domain-model](../../core-context/domain-model.md).
- Do not swallow errors. Let them propagate to the layer responsible for mapping (route handler or MCP tool).

## Naming

- `camelCase` for variables/functions, `PascalCase` for types/errors, `SCREAMING_SNAKE_CASE` for true constants.
- Names state intent. No abbreviations that need a comment.

## Comments

- Comment WHY, not WHAT. No commented-out code. No TODO without an owner/issue reference.

## Async

- `async`/`await` over raw `.then()` chains in application code.
- Never leave a floating promise. Await it or explicitly handle it.

## Scope discipline

- Do not invent requirements. If something is unspecified, treat it as an assumption and record it in [assumptions](../../../docs/assumptions.md).
