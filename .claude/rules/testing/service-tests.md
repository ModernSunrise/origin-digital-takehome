---
paths:
  - "**/*.test.ts"
  - "lib/domain/**"
description: Vitest unit tests target the service layer directly; reset store each test.
---

# Service Tests (Vitest)

Tests target the PURE service layer directly, NOT HTTP and NOT the MCP server. The business rules are the thing under test, so test them where they live. Rationale: [decisions](../../../docs/decisions.md); contract under test: [domain-model](../../core-context/domain-model.md).

## Setup

- Use Vitest. Test files end in `.test.ts`, colocated near or under `lib/domain`.
- Call `resetStore()` in `beforeEach` so every test starts from an empty, isolated store. See [service-layer-purity](../domain/service-layer-purity.md).
- Build fixtures through the services (`createEvent`, `register`), not by poking the store internals.
- Control `now` for time-dependent tests (past-event) via the injected time helper. Do not rely on real wall-clock for R1.

## What to assert

- Services are async — `await` them. Assert thrown errors by TYPE with `await expect(fn()).rejects.toBeInstanceOf(ErrorType)`, not on message strings or status codes. Status mapping is a handler concern, not tested here.
- Assert derived values (`registrationCount`, `availableCapacity`) after each mutation.

## Required coverage (must all exist)

| Case | Expectation |
| --- | --- |
| R1 register for past event | throws `PastEventError` |
| R2 register when full | throws `CapacityExceededError` |
| R3 double-register same user | throws `DuplicateRegistrationError` |
| Reduce `maxCapacity` below current count | throws `CapacityBelowCurrentError` |
| Unregister frees a slot | fill to cap → unregister one → register succeeds |
| Unregister when not registered | throws `RegistrationNotFoundError` |
| Get/update missing event | throws `EventNotFoundError` |

## Edge discipline

- Test the boundary, not just the middle: capacity exactly at limit (last slot succeeds, next fails), event starting exactly at `now`, empty `description` allowed, re-register after unregister succeeds.
- One behavior per test. Name tests by rule/outcome, e.g. `register › rejects past event`.

## Scope

- Do NOT write HTTP/route tests for business rules; the rules are covered at the service layer. Route handlers only add parsing + mapping, which is thin by design ([api/route-handlers](../api/route-handlers.md)).
- Do NOT spin up the MCP server in unit tests; tools are thin adapters over the same services ([mcp/tool-conventions](../mcp/tool-conventions.md)).

## Don't

- No shared mutable state between tests. No test order dependence.
- No real timers, no network, no database — storage is in-memory by design ([constraints](../../../docs/constraints.md)).
- No raw store access to assert outcomes; assert through service reads.
