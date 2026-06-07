---
name: add-endpoint
description: Use when adding or extending an event-API capability across the pure service layer, REST route handler, MCP tool, shared Zod schema, and Vitest tests. Enforces service-first development and keeps the two consumers (HTTP + MCP) in sync over one rule-set.
---

# Add (or Extend) a Capability Across Both Consumers

This is the canonical workflow for every change to the event API surface. The invariant: **one rule-set, two consumers.** Business logic lives once in the pure service layer; the REST route handler and the MCP tool are thin adapters over it. Never implement a behavior in one consumer that the other lacks, and never put a rule in an adapter.

**Golden order: domain -> service -> validation -> tests -> REST adapter -> MCP adapter -> docs.** Do not skip ahead. Code the rule and prove it with tests BEFORE exposing it over any transport. If you are tempted to write the route handler first, stop — the handler is the last functional step, not the first.

References (do not restate their content here — link and move on):
- Precise contract (entity types, service signatures, error -> status table, endpoint <-> service <-> tool table): [`../../core-context/domain-model.md`](../../core-context/domain-model.md)
- MCP server design (tool inventory, SDK setup, error surfacing): [`../../core-context/mcp-server.md`](../../core-context/mcp-server.md)
- Layer rules: [`service-layer-purity.md`](../../rules/domain/service-layer-purity.md), [`route-handlers.md`](../../rules/api/route-handlers.md), [`service-tests.md`](../../rules/testing/service-tests.md), [`tool-conventions.md`](../../rules/mcp/tool-conventions.md)
- Rationale for design choices (ADRs): [`../../../docs/decisions.md`](../../../docs/decisions.md)

## Step 1 — Extend domain types and invariants (`lib/domain`)

- Add or modify the entity type and any derived fields. Keep `registrationCount` / `availableCapacity` **derived** from registrations, never stored as mutable truth.
- State the new invariant in plain English next to the type, then mirror it into `domain-model.md` (Step 7). Example invariants: `(eventId, userId)` is unique; `maxCapacity` is a positive integer.
- If the change touches the store shape, update the singleton `store` module's Maps and keep the `resetStore` seam intact — tests depend on it for isolation.
- Do NOT add HTTP, Next, or MCP imports in this layer. It is transport-agnostic. If a type needs to know about `Request` or a status code, you are in the wrong file.

## Step 2 — Add the pure service method + domain error(s) (`lib/domain`)

- Implement the behavior as a named **async** function in the `event-service` or `registration-service` module — not a class method. It is transport-agnostic: takes/returns plain data, reads/writes the store via `lib/domain/store`, and **throws** typed domain errors. No `Request`/`Response`, no status codes, no transport awareness.
- Enforce ALL business rules HERE — past-event (R1), capacity (R2), duplicate (R3), capacity-below-current-count. The adapters must never re-check or duplicate a rule.
- Reuse an existing domain error before inventing one. If you must add a new error, it maps to exactly one HTTP status and one MCP error surface; register that row in the error table in `domain-model.md`. Throw, never return, error objects:

```ts
// lib/domain/registration-service.ts (sketch — see service-layer-purity.md)
import { findEvent, findRegistration, findRegistrationsByEvent, saveRegistration } from './store';

export async function register(eventId: string, userId: string): Promise<Registration> {
  const event = await findEvent(eventId);
  if (!event) throw new EventNotFoundError(eventId);
  if (new Date(event.date) < new Date()) throw new PastEventError(eventId);   // R1
  if (await findRegistration(eventId, userId))
    throw new DuplicateRegistrationError(eventId, userId);                     // R3
  if ((await findRegistrationsByEvent(eventId)).length >= event.maxCapacity)
    throw new CapacityExceededError(eventId);                                  // R2
  // ...build Registration, await saveRegistration(reg), return reg
}
```

## Step 3 — Add/extend the shared Zod schema (`lib/validation`)

- Define the input schema ONCE. Both the route handler (Step 5) and the MCP tool (Step 6) import this exact schema. Never write a second, parallel schema for the other consumer — that is how the two surfaces silently drift.
- Validate shape and the semantic constraints Zod can express statically: non-empty `title`, positive-integer `maxCapacity`, ISO-8601 UTC `date`. Rules that need store state (capacity, duplicates, past-event) stay in the service, NOT here.
- Export the inferred TS type (`z.infer<...>`) so the handler, the tool, and the service signature all stay aligned to one definition.

## Step 4 — Write Vitest service tests FIRST (`lib/domain/**`, `*.test.ts`)

- Test the **service directly**, not over HTTP. Call `resetStore()` in `beforeEach` so each test starts clean.
- Cover the happy path plus every rule and edge the change introduces. For registration-shaped work that is: R1 (past event -> `PastEventError`), R2 (full -> `CapacityExceededError`), R3 (double-register -> `DuplicateRegistrationError`), and edges — reduce `maxCapacity` below current count -> `CapacityBelowCurrentError`; fill to cap, unregister one, re-register succeeds (the slot frees immediately); unregister-when-not-registered -> `RegistrationNotFoundError`; not-found paths.
- Assert on the thrown error TYPE, not on a message string. Tests must pass before you write any adapter. If a rule has no test, it is not done.

## Step 5 — Add the THIN REST route handler (`app/api/**`)

- Pattern only: **parse with the shared Zod schema -> call the service -> map the thrown domain error to a status -> serialize.** No business logic, no rule checks, no direct store access in the handler.
- Place the file per the endpoint inventory in `domain-model.md` (e.g. `app/api/events/[id]/registrations/route.ts`) and match the HTTP method + path exactly.
- Use the canonical error -> status mapping (400 / 404 / 409 / 422). Do not invent statuses; if an error lacks a mapping, fix it in Step 2, not here.

```ts
// app/api/events/[id]/registrations/route.ts (sketch — see route-handlers.md)
export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;                          // Next 15: params is async
  const parsed = RegisterSchema.safeParse(await req.json());
  if (!parsed.success) return json(400, parsed.error.flatten());
  try {
    const reg = await register(id, parsed.data.userId); // SAME shared service fn
    return json(201, reg);
  } catch (e) {
    return mapDomainError(e); // central domain-error -> status mapper
  }
}
```

## Step 6 — Add the MCP tool over the SAME service (`mcp/**`)

- Register a tool mirroring the service method, named in snake_case per `mcp-server.md` (e.g. `register_for_event`). Its input schema is the SAME shared Zod schema from Step 3.
- The tool calls the SAME service method the REST handler calls. Surface thrown domain errors as MCP tool errors (`isError` content), reusing the mapping in `domain-model.md`.
- This step is **non-optional**: if Step 5 added or changed a capability, the MCP tool MUST change in the same commit. The two consumers never drift — that parity IS the differentiator.

## Step 7 — Update docs and the index

- Update the endpoint <-> service-method <-> MCP-tool table and the error mapping table in [`../../core-context/domain-model.md`](../../core-context/domain-model.md) — this is the canonical contract and must reflect reality.
- If the public surface changed (new endpoint, new tool, new error), update the root [`../../../CLAUDE.md`](../../../CLAUDE.md) index and the requirements-level inventory in [`../../../docs/requirements.md`](../../../docs/requirements.md).
- Add a new ADR to [`../../../docs/decisions.md`](../../../docs/decisions.md) only when the change reflects a genuine design decision worth recording.

## Done-check

- [ ] One service method holds the logic; both adapters are thin (parse -> service -> map).
- [ ] One shared Zod schema feeds BOTH the REST handler and the MCP tool.
- [ ] Service tests cover the new rules + edges and pass before any adapter exists.
- [ ] REST handler AND MCP tool both updated in the same change — no drift.
- [ ] `domain-model.md` tables and the `CLAUDE.md` index reflect the new surface.
