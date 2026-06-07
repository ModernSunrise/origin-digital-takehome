---
paths:
  - "lib/domain/**"
description: Purity rules for the domain/service layer — the heart of the exercise.
---

# Service-Layer Purity (`lib/domain/**`)

This layer is the single home of business rules. Two consumers depend on it: HTTP route handlers and MCP tools. Keep it pure so both stay thin. Full design: [architecture](../../../docs/architecture.md); precise contract: [domain-model](../../core-context/domain-model.md).

## Purity (hard)

- NEVER import from `next`, `next/server`, `react`, or any HTTP/framework package here.
- NEVER import Zod or do request-shape validation here. Shape validation is a boundary concern (route handler / MCP tool). This layer assumes already-parsed, typed inputs.
- No I/O except the in-memory store module. No `fetch`, no filesystem, no `console.log` in service logic.
- No environment/config reads. Pure functions of their inputs plus the store.

## Where business rules live

- ALL three business rules are enforced HERE, nowhere else:
  - R1 past-event → `PastEventError`
  - R2 capacity → `CapacityExceededError`
  - R3 double-register → `DuplicateRegistrationError`
- Also enforced here: capacity-below-current-count on update → `CapacityBelowCurrentError`; missing resources → `EventNotFoundError` / `RegistrationNotFoundError`.
- Enforcement points and exact rules: [domain-model](../../core-context/domain-model.md). Rationale: [decisions](../../../docs/decisions.md).

## Errors

- On any rule violation, THROW the matching typed domain error. Do not return error objects, do not return `null` to signal failure (except `find*` returning `undefined` for absence).
- Do not map errors to HTTP/MCP here. Mapping is the consumer's job.
- Error messages are human-readable but carry no HTTP status. Status mapping table lives in [domain-model](../../core-context/domain-model.md).

## Services are functions

- `EventService` and `RegistrationService` are modules of pure functions, not stateful classes. Signatures: [domain-model](../../core-context/domain-model.md).
- Method prefix contract: `find*` may return `undefined`; `get*` throws NotFound; `create*/update*` return the entity; `register/unregister` mutate via the store and return the result/void per the spec.

## Store discipline

- The store (`lib/domain/store`) is a singleton module holding `events` and `registrations` Maps. Only the store mutates them.
- Expose `resetStore()` ONLY for test isolation. Production code must never call it. See [testing/service-tests](../testing/service-tests.md).
- Derived values (`registrationCount`, `availableCapacity`) are COMPUTED from registrations on read, never persisted as mutable fields.

## Determinism

- The only nondeterminism allowed is `id` generation (uuid) and `now` for time checks. Keep these behind small helpers so tests can reason about them.

## Don't

- No HTTP status codes, no response shaping, no MCP types in this folder.
- No business logic outside this folder. If a handler or tool contains a rule, it is in the wrong place.
