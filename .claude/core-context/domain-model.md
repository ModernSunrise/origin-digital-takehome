# Domain Model (Canonical Contract)

The single source of truth for entities, invariants, services, errors, and the
HTTP/MCP surface. AI-facing and buildable. Rationale lives in
[`../../docs/decisions.md`](../../docs/decisions.md) — do not argue *why* here, link.

Related: [`mcp-server.md`](./mcp-server.md) (MCP detail) ·
[`../../docs/architecture.md`](../../docs/architecture.md) (layering/flow).

---

## Entities

Stored fields are authoritative. Derived fields are computed, never persisted.

```ts
// lib/domain/types.ts

/** Stored event. registrationCount/availableCapacity are DERIVED, not stored. */
export interface Event {
  id: string;            // uuid v4
  title: string;         // non-empty (trimmed length > 0)
  description: string;   // may be empty ""
  date: string;          // ISO-8601 UTC datetime, event start (e.g. 2026-09-01T18:00:00.000Z)
  maxCapacity: number;   // positive integer (>= 1)
  createdAt: string;     // ISO-8601 UTC datetime
  updatedAt: string;     // ISO-8601 UTC datetime
}

/** Stored registration. (eventId, userId) is unique. */
export interface Registration {
  id: string;            // uuid v4
  eventId: string;       // FK -> Event.id
  userId: string;        // the email/name identifier (auth out of scope)
  registeredAt: string;  // ISO-8601 UTC datetime
}

/** Read model returned to consumers: stored Event + derived counts. */
export interface EventView extends Event {
  registrationCount: number;   // = registrations where eventId == this.id
  availableCapacity: number;   // = max(0, maxCapacity - registrationCount)
}
```

`userId` is an opaque identifier (email or name string). No User entity, no auth —
see [`../../docs/assumptions.md`](../../docs/assumptions.md).

---

## Invariants

Enforced in the service layer. Violations throw a domain error (see table below).

1. `title` is non-empty after trim.
2. `maxCapacity` is a positive integer (`>= 1`).
3. `date` is a valid ISO-8601 UTC datetime.
4. `(eventId, userId)` is unique across registrations — no double-registration (R3).
5. `registrationCount` for an event never exceeds its `maxCapacity` (R2).
6. A registration's `eventId` always references an existing event.
7. `maxCapacity` may never be updated below the event's current `registrationCount` (edge of R2).
8. Registration is rejected when `event.date < now` (R1, past event).
9. `registrationCount` and `availableCapacity` are always derived from the
   registrations Map — never stored, never cached as mutable truth.

`now` = server wall clock (`new Date()`) at request time; compared in UTC.

---

## In-Memory Store

A singleton module and the **single persistence seam**. State lives in module
scope; survives within one process only (single-instance by design — see
[`../../docs/decisions.md`](../../docs/decisions.md) ADR-002). Not concurrency-safe;
acceptable for the exercise. Accessors are `async` on purpose: swapping these Maps
for Cosmos DB then becomes an implementation change *inside this module*, not an
async refactor that ripples out to every service, handler, and tool.

```ts
// lib/domain/store.ts — swap the Maps for Cosmos DB without touching any signature (ADR-002)

const events = new Map<string, Event>();               // key: event.id
const registrations = new Map<string, Registration>(); // key: registration.id

export async function findEvent(id: string): Promise<Event | undefined> { return events.get(id); }
export async function findAllEvents(): Promise<readonly Event[]> { return [...events.values()]; }
export async function saveEvent(e: Event): Promise<void> { events.set(e.id, e); }

export async function findRegistration(eventId: string, userId: string): Promise<Registration | undefined> {
  return [...registrations.values()].find((r) => r.eventId === eventId && r.userId === userId);
}
export async function findRegistrationsByEvent(eventId: string): Promise<readonly Registration[]> {
  return [...registrations.values()].filter((r) => r.eventId === eventId);
}
export async function saveRegistration(r: Registration): Promise<void> { registrations.set(r.id, r); }
export async function removeRegistration(id: string): Promise<void> { registrations.delete(id); }

/** Test-only isolation seam. Clears all state. Call in beforeEach. (Sync; tests only.) */
export function resetStore(): void { events.clear(); registrations.clear(); }
```

Rules:
- Services read/write only through these store functions. No other module touches the Maps.
- `resetStore()` is used ONLY by tests. Never call from route handlers, services, or MCP tools.
- Registration lookups by `(eventId, userId)` and `eventId` scan the registrations
  Map (acceptable at this scale; no secondary indexes).

---

## Services (pure, no HTTP)

Named **async** functions in plain TS modules — not classes. No `Request`/`Response`,
no Next imports, no I/O beyond the store. Throw domain errors; never return HTTP
status codes. These are the unit-test targets.

```ts
// lib/domain/event-service.ts  (named async functions — not a class)
export async function createEvent(input: CreateEventInput): Promise<EventView>;
export async function getEvent(id: string): Promise<EventView>;            // throws EventNotFoundError
export async function listEvents(): Promise<readonly EventView[]>;
export async function updateEvent(id: string, patch: UpdateEventInput): Promise<EventView>;
//   partial patch: title? | description? | date? | maxCapacity?
//   throws EventNotFoundError, ValidationError, CapacityBelowCurrentError

// lib/domain/registration-service.ts  (named async functions — not a class)
export async function register(eventId: string, userId: string): Promise<Registration>;
//   throws (in this order) EventNotFoundError, PastEventError, DuplicateRegistrationError, CapacityExceededError
export async function unregister(eventId: string, userId: string): Promise<void>;
//   throws EventNotFoundError, RegistrationNotFoundError
export async function listRegistrationsForEvent(eventId: string): Promise<readonly Registration[]>;
//   throws EventNotFoundError
```

**Why async?** The in-memory store resolves synchronously today, but services return
`Promise<T>` so swapping it for an async persistence layer (Cosmos DB, ADR-002) is an
implementation change behind the same signatures — route handlers and MCP tools already
`await`, so they stay untouched. This is the productionization seam, not incidental async.

Input types (`CreateEventInput`, `UpdateEventInput`) are the parsed output of the
shared Zod schemas in `lib/validation` — one definition, two consumers
(route handlers + MCP tools). See
[`../../docs/architecture.md`](../../docs/architecture.md).

Read functions (`getEvent`, `listEvents`) return `EventView` with derived counts.

---

## Domain Error → HTTP Status → MCP Error (canonical mapping)

All errors extend a `DomainError` base carrying a stable `code`. The HTTP error
mapper and the MCP error wrapper both consume this single table. Rationale (esp.
409-vs-422) lives in [`../../docs/decisions.md`](../../docs/decisions.md) ADR-005.

| Domain Error                 | Trigger                                                     | HTTP | MCP result                          |
|------------------------------|------------------------------------------------------------|------|-------------------------------------|
| `ValidationError`            | Bad input shape/semantics (Zod fails at boundary)          | 400  | SDK `InvalidParams` (-32602) — see * |
| `EventNotFoundError`         | Event id does not exist                                    | 404  | `isError: true`, message            |
| `RegistrationNotFoundError`  | Unregister a user not registered for the event             | 404  | `isError: true`, message            |
| `DuplicateRegistrationError` | R3 — `(eventId, userId)` already registered                | 409  | `isError: true`, message            |
| `CapacityExceededError`      | R2 — event full (`registrationCount == maxCapacity`)       | 409  | `isError: true`, message            |
| `CapacityBelowCurrentError`  | Update `maxCapacity` below current `registrationCount`     | 409  | `isError: true`, message            |
| `PastEventError`             | R1 — register for an event whose `date < now`              | 422  | `isError: true`, message            |

Mapping shape (summary): `400` = malformed; `404` = missing resource; `409` =
conflict with current resource STATE; `422` = well-formed valid input violating a
time/business rule. Zod boundary failures map to `400 ValidationError`.

Error payload (HTTP body): `{ error: { code: string, message: string, issues?: ... } }`.
MCP surfaces the same `code`/`message` as `isError: true` tool content — see
[`mcp-server.md`](./mcp-server.md). **\* Exception:** input-*shape* validation on the MCP
side is enforced by the SDK against the shared Zod schema and surfaces as a protocol-level
`InvalidParams` (-32602) error *before* the tool body runs — not as an `isError` result.
So the `ValidationError → 400` row is HTTP-only; on MCP the SDK rejects bad input
pre-handler. (Services never throw `ValidationError`; shape validation is a boundary concern.)

---

## Endpoint ↔ Service ↔ MCP Tool (canonical surface)

One service method per capability; HTTP and MCP are thin adapters over it. No
`DELETE /api/events/:id` — hard-delete is excluded (ADR-004).

| REST endpoint                                    | Service method                              | MCP tool                    |
|--------------------------------------------------|---------------------------------------------|-----------------------------|
| `POST /api/events`                               | `EventService.createEvent`                  | `create_event`              |
| `GET /api/events`                                | `EventService.listEvents`                   | `list_events`               |
| `GET /api/events/:id`                            | `EventService.getEvent`                     | `get_event`                 |
| `PATCH /api/events/:id`                          | `EventService.updateEvent`                  | `update_event`              |
| `POST /api/events/:id/registrations`             | `RegistrationService.register`              | `register_for_event`        |
| `DELETE /api/events/:id/registrations/:userId`   | `RegistrationService.unregister`            | `unregister_from_event`     |
| `GET /api/events/:id/registrations`              | `RegistrationService.listRegistrationsForEvent` | `list_event_registrations` |

`EventService.` / `RegistrationService.` denote the **module namespaces**
(`event-service.ts`, `registration-service.ts`), whose named async functions are
imported directly — no class, no `import *` (see
[`../rules/general/code-quality.md`](../rules/general/code-quality.md)).

Request bindings:
- `POST /api/events` body → `CreateEventInput` (`title, description?, date, maxCapacity`).
- `PATCH /api/events/:id` body → `UpdateEventInput` (any subset of `title, description, date, maxCapacity`).
- `POST /api/events/:id/registrations` body → `{ userId }`; `eventId` from path.
- `DELETE …/registrations/:userId` → `eventId` and `userId` both from path.

Success responses: `createEvent` → `201` + `EventView`; reads → `200`;
`updateEvent` → `200` + `EventView`; `register` → `201` + `Registration`;
`unregister` → `204` (no body); list registrations → `200` + `Registration[]`.

---

## Business-Rule Enforcement Points

Each rule is enforced exactly once, in the service layer (not in handlers, not in MCP).

| Rule | Statement                                  | Enforced in                       | Error                        |
|------|--------------------------------------------|-----------------------------------|------------------------------|
| R1   | Cannot register for a PAST event           | `RegistrationService.register`    | `PastEventError` (422)       |
| R2   | Cannot exceed `maxCapacity`                | `RegistrationService.register`    | `CapacityExceededError` (409)|
| R2′  | Cannot set `maxCapacity` < current count   | `EventService.updateEvent`        | `CapacityBelowCurrentError` (409) |
| R3   | Cannot double-register same user/event     | `RegistrationService.register`    | `DuplicateRegistrationError` (409)|

`register` evaluation order: existence (`EventNotFoundError`) → past
(`PastEventError`) → duplicate (`DuplicateRegistrationError`) → capacity
(`CapacityExceededError`). Capacity is checked against the *current* derived
`registrationCount`; unregister frees a slot immediately (see
[`../../docs/assumptions.md`](../../docs/assumptions.md)).

---

## Required Test Coverage (service layer, Vitest)

Reset store in `beforeEach` via `resetStore()`. Targets services directly, never HTTP.

- R1: register for a past-dated event → `PastEventError`.
- R2: fill to `maxCapacity`, next register → `CapacityExceededError`.
- R3: register same `(eventId, userId)` twice → `DuplicateRegistrationError`.
- Edge: `updateEvent` lowering `maxCapacity` below current count → `CapacityBelowCurrentError`.
- Edge: fill to cap, `unregister` one, register a new user → succeeds (slot freed).
- Edge: `unregister` a user not registered → `RegistrationNotFoundError`.
- Not-found: `getEvent`/`register`/`unregister`/`listRegistrationsForEvent` on
  unknown event id → `EventNotFoundError`.
