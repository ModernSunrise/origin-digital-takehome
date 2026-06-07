# Architecture

How the Event Management system is structured, why the layers are drawn where they
are, and how a request flows from each consumer down to the one place business rules
live. The organizing idea: **one pure domain/service layer, two consumers (HTTP route
handlers and MCP tools)**. One rule-set, two front doors.

Related reading:

- Requirements (what we build): [requirements.md](./requirements.md)
- Constraints (limits we work inside): [constraints.md](./constraints.md)
- Assumptions (what we hold fixed): [assumptions.md](./assumptions.md)
- Decisions / the "why": [decisions.md](./decisions.md)
- Precise contract (types, signatures, full mapping tables): [../.claude/core-context/domain-model.md](../.claude/core-context/domain-model.md)
- MCP server detail: [../.claude/core-context/mcp-server.md](../.claude/core-context/mcp-server.md)

---

## 1. Layered architecture

Two consumers sit on top of a single pure core. Neither consumer owns business logic;
both delegate to the same services, which are the only code that touches the store.

```
        ┌──────────────────────┐        ┌──────────────────────┐
        │  HTTP consumer       │        │  MCP consumer        │
        │  app/api/** route    │        │  mcp/** tools        │
        │  handlers (thin)     │        │  (thin)              │
        └──────────┬───────────┘        └──────────┬───────────┘
                   │  parse + validate (shared Zod) │
                   │                                │
                   └───────────────┬────────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │  Domain / service layer        │   ← PURE. No HTTP, no SDK.
                   │  EventService                  │     Throws domain errors.
                   │  RegistrationService           │     Enforces R1/R2/R3.
                   └───────────────┬────────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │  In-memory store (singleton)   │   ← Maps<id, Event/Registration>.
                   │  lib/domain/store              │     resetStore() seam (tests only).
                   └───────────────────────────────┘
```

Reading the diagram top-down:

- **Consumers** are interchangeable adapters. Adding a third (a CLI, a queue worker)
  would not touch anything below the dashed line.
- **Validation** happens at each consumer boundary using the *same* shared Zod schemas,
  so both doors reject malformed input identically before the core is ever called.
- **Services** are plain TypeScript. They know nothing about `Request`, `Response`,
  status codes, or the MCP SDK. They enforce the three business rules and throw typed
  domain errors.
- **The store** is a single in-memory singleton module. This is a deliberate
  single-instance design, not an oversight — see [decisions.md](./decisions.md) ADR-002
  and the consequence in [constraints.md](./constraints.md).

---

## 2. Folder / module structure

The planned repository layout. Each box maps to a layer above.

```
.
├── app/
│   ├── api/
│   │   └── events/
│   │       ├── route.ts                      # POST /api/events, GET /api/events
│   │       └── [id]/
│   │           ├── route.ts                  # GET, PATCH /api/events/:id
│   │           └── registrations/
│   │               ├── route.ts              # POST, GET .../registrations
│   │               └── [userId]/
│   │                   └── route.ts          # DELETE .../registrations/:userId
│   ├── (ui)/                                 # React frontend (event + registration mgmt)
│   ├── layout.tsx
│   └── page.tsx
│
├── lib/
│   ├── domain/                               # ← THE PURE CORE. No HTTP / SDK imports.
│   │   ├── types.ts                          # Event, Registration entity types
│   │   ├── errors.ts                         # domain error taxonomy
│   │   ├── store.ts                          # in-memory singleton + resetStore()
│   │   ├── event-service.ts                  # EventService
│   │   └── registration-service.ts           # RegistrationService
│   └── validation/
│       └── schemas.ts                        # shared Zod schemas (one definition)
│
├── app/api/_lib/
│   └── http.ts                               # domain error -> HTTP status + JSON response helpers (HTTP-only glue)
│
├── mcp/
│   ├── server.ts                             # @modelcontextprotocol/sdk server setup
│   ├── tools/
│   │   ├── events.ts                         # event tool registrations -> event-service
│   │   └── registrations.ts                  # registration tool registrations -> registration-service
│   └── errors.ts                             # domain error -> isError tool result (MCP-only glue)
│
└── lib/domain/__tests__/                     # Vitest, target services directly
    ├── event-service.test.ts
    └── registration-service.test.ts
```

Key placements and their reasons:

- `lib/domain/**` is the **only** place business rules live. The service-layer purity
  rule (`.claude/rules/domain/service-layer-purity.md`) forbids HTTP/SDK imports here.
- `lib/validation/schemas.ts` is imported by **both** `app/api/**` and `mcp/**`.
  Defined once, consumed twice (ADR-006).
- `_lib/http.ts` lives under the HTTP consumer because mapping a domain error to a
  *status code* is an HTTP concern. The MCP consumer has its own, simpler mapping
  (domain error -> `isError` tool result) — see [mcp-server.md](../.claude/core-context/mcp-server.md).
- Tests sit beside the domain code and exercise services, never HTTP
  (`.claude/rules/testing/service-tests.md`).

---

## 3. Dependency-direction rules

Dependencies point **inward and downward** only. The core never imports a consumer.

```
app/api/**  ─┐
             ├─► lib/validation  ─► lib/domain  ─► (nothing below; pure)
mcp/**      ─┘                          │
                                        └─► lib/domain/store (singleton)
```

Hard rules (enforced by the rules layer):

1. `lib/domain/**` imports **no** HTTP types, **no** `@modelcontextprotocol/sdk`, **no**
   `next/*`. If it does, the layering is broken.
2. Consumers (`app/api/**`, `mcp/**`) **never** contain branching business logic. They
   parse, call one service method, and translate the outcome. A conditional that decides
   *whether a rule is satisfied* belongs in a service, not a handler.
3. Validation schemas (`lib/validation`) depend only on domain types, never on a
   consumer. Both consumers depend on them.
4. The store is reached **only** through services. Consumers never touch the store
   directly; tests reach it only via `resetStore()` for isolation.
5. No consumer imports another consumer. HTTP and MCP are siblings, not a chain.

The payoff: the entire business surface is unit-testable without a server, a transport,
or a mock HTTP layer — and a second transport (MCP) was added without duplicating a
single rule.

---

## 4. Request lifecycle — HTTP path

Example: `POST /api/events/:id/registrations` with body `{ "userId": "a@b.com" }`.

```
Client ──HTTP──► app/api/events/[id]/registrations/route.ts
                   1. Read path param `id`, parse JSON body.
                   2. Validate body with shared Zod schema  ──fail──► 400 (ValidationError)
                   3. Call RegistrationService.register(id, userId)
                            │
                            ▼
                 lib/domain/registration-service.ts  (PURE)
                   4. Load event from store; missing? throw EventNotFoundError
                   5. Enforce R1 (past event?)        → throw PastEventError
                   6. Enforce R3 (already registered?) → throw DuplicateRegistrationError
                   7. Enforce R2 (at capacity?)        → throw CapacityExceededError
                   8. Persist Registration in store, return it
                            │
                            ▼  (return value OR thrown domain error)
                 route.ts (cont.)
                   9. Success → 201 + JSON registration
                  10. Domain error → error-mapper.ts → status code + JSON error body
```

The handler is thin: steps 1–2 and 9–10 are pure plumbing (parse, validate, serialize,
map). Every decision in steps 4–8 lives in the service. The status code emerges from
the *type* of domain error, not from `if` branches in the handler.

---

## 5. Request lifecycle — MCP path

Example: the `register_for_event` tool invoked by an agent with the same arguments.

```
Agent ──MCP──► mcp/tools/registrations.ts  (register_for_event handler)
                   1. Receive tool arguments.
                   2. Validate args with the SAME shared Zod schema ──fail──► isError result
                   3. Call RegistrationService.register(eventId, userId)
                            │
                            ▼
                 lib/domain/registration-service.ts  (PURE)   ← identical to HTTP step 4–8
                   4–8. Same load, same R1/R2/R3 enforcement, same domain errors,
                        same persistence. This file does not know which consumer called it.
                            │
                            ▼  (return value OR thrown domain error)
                 mcp/tools/registrations.ts (cont.)
                   9. Success → tool result with the registration as content
                  10. Domain error → tool result with isError: true + the error message
```

The two lifecycles **converge at step 3** on the exact same `RegistrationService.register`
call, running the exact same R1/R2/R3 checks against the exact same store. The only
differences are at the edges: how input arrives (HTTP body vs tool args — both validated
by the same Zod schema) and how an outcome is reported (HTTP status code vs MCP
`isError` result). That convergence is the architectural point of the exercise; the MCP
detail lives in [mcp-server.md](../.claude/core-context/mcp-server.md) (ADR-003).

---

## 6. Validation and error flow

### Validation — at the boundary, defined once

Shape and basic semantic validation (required fields, non-empty title, positive integer
capacity, ISO-8601 datetime) happen in shared Zod schemas at each consumer boundary,
*before* a service is called. Anything malformed is rejected immediately as a
validation failure. This keeps the core focused on *business* invariants (R1/R2/R3,
capacity-below-count) rather than re-checking input shape. One schema set, two consumers
— see ADR-006 in [decisions.md](./decisions.md).

Services still own invariants that depend on current state (is the event in the past? is
it full? is this user already registered?) — those cannot be expressed by a schema and
must be checked where the store is read.

### Error flow — typed domain errors translated at the edge

The service layer speaks only in **typed domain errors**; it never knows about status
codes or `isError`. Each consumer translates that one vocabulary into its own dialect —
**same taxonomy, two transports**:

- `400` malformed input · `404` missing resource · `409` state conflict (duplicate, full,
  capacity-below-count) · `422` valid-but-past-event time-rule violation.
- HTTP emits the status code; MCP emits `isError: true` carrying the domain-error name.

The canonical seven-row error table, the precise types, and the endpoint ↔
service-method ↔ MCP-tool mapping are owned by
[../.claude/core-context/domain-model.md](../.claude/core-context/domain-model.md); the
rationale for the status choices (notably 409 for state conflicts vs 422 for the
past-event time-rule violation) is argued in [decisions.md](./decisions.md) ADR-005.
Follow the links rather than trusting any restatement here.

The shape of the flow, regardless of consumer:

```
service throws DomainError ─► consumer catches at its boundary ─► maps by error type
   HTTP:  -> error-mapper.ts -> { status, JSON body }
   MCP:   -> { isError: true, content: [message] }
```

Because mapping is keyed on error *type*, adding a new rule means adding a new domain
error and one row to each mapping — the handler and tool logic stay untouched. The
full add-a-capability workflow is packaged in the `add-endpoint` skill
([../.claude/skills/add-endpoint/SKILL.md](../.claude/skills/add-endpoint/SKILL.md)).

---

## 7. Why this shape

- **Testability**: rules are plain functions over an in-memory store, so Vitest hits
  them directly with no transport. See [requirements.md](./requirements.md) for the
  required coverage and [constraints.md](./constraints.md) for the Vitest choice.
- **No duplication**: one rule-set, one validation-schema set, two consumers. The MCP
  server reuses the HTTP brain rather than reimplementing it (ADR-003).
- **A clean productionization seam**: the store is the only stateful, swappable module,
  and services are `async` by design — so replacing the in-memory Maps with Cosmos DB
  (and deploying on Azure Container Apps with CI/CD and an Entra ID auth seam) is a
  change *behind unchanged signatures*: one module moves, the rules and every caller stay
  put. That path is documented in [decisions.md](./decisions.md) ADR-002, and the
  single-instance consequence in [constraints.md](./constraints.md).
