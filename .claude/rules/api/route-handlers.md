---
paths:
  - "app/api/**"
description: Route handlers are thin adapters — parse, call service, map error. No logic.
---

# Route Handlers (`app/api/**`)

Route handlers are a THIN HTTP adapter over the pure domain layer. They contain ZERO business logic. Full request lifecycle: [architecture](../../../docs/architecture.md).

## The only four steps a handler does

1. Parse + validate input with the SHARED Zod schema from `lib/validation` (same schema the MCP tools use). On failure → `400`.
2. Pull path params (`:id`, `:userId`) and the validated body.
3. Call the matching service function in `lib/domain`. ONE service call per handler.
4. Map the result/error to an HTTP response (see mapping below).

No step beyond these. If you are writing an `if` that enforces a rule, STOP — it belongs in the service. See [service-layer-purity](../domain/service-layer-purity.md).

## Validation

- Validate shape/semantics at the boundary with Zod. Do not hand-roll checks the schema should own.
- Schemas are defined ONCE in `lib/validation` and shared with MCP. Never redefine an input schema here. See [decisions](../../../docs/decisions.md) (ADR-006).
- A Zod parse failure maps to `400 Bad Request`.

## Error mapping

- Wrap the service call; catch domain errors and map each to its status using the canonical table — do not hardcode a status without consulting it. Table: [domain-model](../../core-context/domain-model.md).
- Summary (authoritative table in domain-model): `404` not-found; `409` state conflict (duplicate, full, capacity-below-count); `422` past-event rule; `400` bad input.
- Use a single shared error-to-Response mapper; do not duplicate `switch` logic across handlers.
- Unknown/unexpected errors → `500`. Never leak stack traces in the body.

## Endpoint inventory

- Implement exactly the endpoints in [domain-model](../../core-context/domain-model.md). NO `DELETE /api/events/:id` — hard-delete is excluded ([decisions](../../../docs/decisions.md), ADR-004).
- One route file per resource path; HTTP-method exports (`GET`, `POST`, `PATCH`, `DELETE`) map 1:1 to service functions.

## Responses

- Return JSON via `NextResponse.json(...)` with the correct status.
- Success codes: `201` for create, `200` for reads/updates, `204` (no body) for unregister. Match [domain-model](../../core-context/domain-model.md).
- `await` the (async) service call before mapping its result or caught error.
- Serialize entities exactly as the domain types define; include derived `registrationCount`/`availableCapacity` on event reads.

## Don't

- No store access, no Map manipulation, no rule checks here.
- No business branching beyond mapping a thrown domain error to a status.
- No duplicated Zod schemas — import the shared one.
