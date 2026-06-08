# Architecture Decision Records

This document records the significant engineering decisions for the Event
Management API, in [ADR](https://adr.github.io/) format. It is the **hub** the
rest of the documentation cites when it needs the *why* behind a constraint, an
assumption, or a piece of the architecture.

Each ADR is self-contained: **Status / Context / Decision / Consequences /
Alternatives considered**. Where an ADR depends on facts owned elsewhere, it
links rather than restates them.

**Related docs:** [Requirements](./requirements.md) ·
[Constraints](./constraints.md) · [Assumptions](./assumptions.md) ·
[Architecture](./architecture.md) ·
[Domain model (canonical contract)](../.claude/core-context/domain-model.md) ·
[MCP server](../.claude/core-context/mcp-server.md)

| ADR | Decision | Status |
| --- | --- | --- |
| [001](#adr-001-stack-nextjs-full-stack-typescript) | Next.js full-stack + TypeScript | Accepted |
| [002](#adr-002-in-memory-store-is-single-instance-by-design) | In-memory store = single-instance by design (+ Azure path) | Accepted |
| [003](#adr-003-ship-an-mcp-server-over-the-same-domain-layer) | MCP server over the same domain layer | Accepted |
| [004](#adr-004-no-hard-delete-of-events-in-the-mvp) | No hard-delete of events in the MVP | Accepted |
| [005](#adr-005-http-error-mapping-taxonomy-400404409422) | HTTP error-mapping taxonomy (400/404/409/422) | Accepted |
| [006](#adr-006-validate-at-the-boundary-with-shared-zod-schemas) | Validate at the boundary with shared Zod schemas | Accepted |
| [007](#adr-007-reskin-to-the-origin-digital-brand-language--light-only) | Reskin to Origin Digital brand language (light-only) | Accepted |

---

## ADR-001: Stack — Next.js full-stack, TypeScript

**Status:** Accepted

### Context

The brief asks for a REST API, a frontend, an MCP server, and unit tests in a
single deliverable that reads cleanly in a live walkthrough. The reviewers are an
Azure/AI consultancy, so the stack should be mainstream, type-safe, and readable
end-to-end without bespoke infrastructure. The accepted technical limits are
owned by [constraints.md](./constraints.md); this ADR records only *why* the
stack was chosen.

### Decision

Build one repository on **Next.js (App Router)** with **TypeScript in strict
mode** throughout:

- **API** via Route Handlers under `app/api/**`.
- **Frontend** via React Server/Client Components in the same app.
- **Validation** via **Zod** at every external boundary (see
  [ADR-006](#adr-006-validate-at-the-boundary-with-shared-zod-schemas)).
- **Tests** via **Vitest**, targeting the pure service layer directly.

The HTTP surface, frontend, MCP server, and tests all import a single pure
domain layer (`lib/domain`). See [architecture.md](./architecture.md) for the
layering and [domain-model.md](../.claude/core-context/domain-model.md) for the
precise contract.

### Consequences

- One language, one toolchain, one `package.json`. A reviewer follows a request
  from the UI through the route handler into the service and back with no context
  switch.
- TypeScript strict makes the domain
  [invariants](../.claude/core-context/domain-model.md) compiler-enforced rather
  than convention.
- Coupling the API to Next's request model is a known tradeoff; the
  productionization path in
  [ADR-002](#adr-002-in-memory-store-is-single-instance-by-design) keeps the
  *business logic* portable by isolating it from the framework.

### Alternatives considered

- **Express/Fastify API + separate React SPA.** More moving parts and a second
  build for no benefit at this scope; the pure service layer would be identical.
- **NestJS.** Strong conventions, but its DI/decorator weight obscures the one
  point the exercise is testing — clean layering — behind framework ceremony.
- **A non-TypeScript backend (Go, Python).** Loses the shared-types story
  between the API, the MCP tools, and the frontend.

---

## ADR-002: In-memory store is single-instance by design

**Status:** Accepted

### Context

The brief mandates **in-memory storage only — no database**. Naively this reads
like a limitation to apologize for. It is better framed as a deliberate boundary
that keeps the exercise focused on business rules while leaving a clean seam for
production storage. The store shape and its test-only `resetStore` seam are
owned by
[domain-model.md](../.claude/core-context/domain-model.md); the full consequence
analysis is owned by [constraints.md](./constraints.md). This ADR owns the
**decision to embrace it** and the **path off it**.

### Decision

Hold all state in a **singleton module** (`lib/domain/store`) backed by `Map`s
for events and registrations. Treat this as **single-instance by design**, not
as an accident:

- State lives in one Node process. There is no second writer, so the business
  invariants (capacity, uniqueness) are enforced without distributed
  coordination.
- The store is accessed **only** through the service layer. No route handler,
  MCP tool, or component reaches into the `Map`s directly.
- This single chokepoint is the seam we would replace to productionize.

**Productionization path (Azure).** When this needs to be a real service, the
in-memory store is swapped for a persistence adapter behind the *same* service
interface:

| Concern | MVP (this exercise) | Production target (Azure) |
| --- | --- | --- |
| Storage | In-memory `Map` singleton | **Cosmos DB** (event + registration containers) |
| Concurrency | Single process, no contention | Cosmos optimistic concurrency (ETag) on capacity/uniqueness |
| Hosting | `next dev` / single container | **Azure Container Apps** (scale-to-zero, revisions) |
| Delivery | Manual `pnpm` scripts | **CI/CD** (GitHub Actions → ACR → Container Apps) |
| Identity | None — user is a string ([ADR-005](#adr-005-http-error-mapping-taxonomy-400404409422), assumptions) | **Entra ID** at the auth seam (out of scope today) |

Because capacity and uniqueness are enforced *inside the service layer*, moving
to a multi-instance deployment becomes a **storage** problem (use Cosmos'
optimistic concurrency to make capacity and uniqueness checks atomic), not a
rewrite of the business logic.

### Consequences

- **Today:** zero setup, fast tests (reset the store between cases via the
  `resetStore` seam in
  [domain-model.md](../.claude/core-context/domain-model.md)), and a razor focus
  on the three business rules.
- **Today's limit:** restarting the process loses all data, and the app **cannot
  be horizontally scaled** — two instances would each enforce capacity against
  their own copy of state. This is acceptable for the exercise and is the natural
  lead-in to the Azure story above. Full consequence list:
  [constraints.md](./constraints.md).
- **For production:** the swap is localized to one adapter. The service tests are
  unchanged because they target the service, not the store implementation.
- This ADR is the **primary interview talking point**: it demonstrates that the
  candidate chose a constraint deliberately and can articulate the road to a
  real, scalable Azure deployment.

### Alternatives considered

- **SQLite / a local file.** Adds persistence but also a schema, a driver, and
  migration concerns the brief explicitly excludes — and it still wouldn't be the
  *production* answer, so it buys complexity without buying the real story.
- **Stand up Cosmos DB now.** Correct production target, but it would drown the
  business-rule exercise in infrastructure for a take-home. Better shown as the
  *next step* than built prematurely.
- **Module-level `let` variables instead of a singleton store module.** Harder to
  give a clean `resetStore` seam and harder to later replace with an adapter.

---

## ADR-003: Ship an MCP server over the same domain layer

**Status:** Accepted

### Context

The brief asks for an MCP server as a differentiator. The cheap version is a
second service that re-implements the rules for an agent. That would create two
sources of truth for capacity, uniqueness, and the past-event rule — exactly the
drift this exercise is designed to avoid. The MCP design detail is owned by
[mcp-server.md](../.claude/core-context/mcp-server.md); this ADR owns the
**principle**.

### Decision

Build an MCP server (TypeScript, official
[`@modelcontextprotocol/sdk`](../.claude/core-context/mcp-server.md)) that
**imports the same `lib/domain` service layer** the route handlers use. One
rule-set, **two consumers**: HTTP and an agent.

- Each tool (`create_event`, `list_events`, `get_event`, `update_event`,
  `register_for_event`, `unregister_from_event`, `list_event_registrations`)
  mirrors a service method one-to-one. The endpoint ↔ service ↔ tool table is
  owned by [domain-model.md](../.claude/core-context/domain-model.md).
- Tool inputs are validated with the **same shared Zod schemas** as the route
  handlers (see
  [ADR-006](#adr-006-validate-at-the-boundary-with-shared-zod-schemas)).
- Domain errors surface as MCP tool errors (`isError` content); the HTTP layer
  maps the same errors to status codes (see
  [ADR-005](#adr-005-http-error-mapping-taxonomy-400404409422)). The taxonomy is
  defined once.

### Consequences

- **No drift.** A change to a business rule (e.g. how capacity is checked) is
  written once in the service and is instantly correct for both the REST API and
  the agent. This is the whole point.
- Demonstrates that the architecture's value is *consumer-agnostic business
  logic* — the same trait that makes the code portable to Cosmos DB in
  [ADR-002](#adr-002-in-memory-store-is-single-instance-by-design) makes it
  reusable by an agent here.
- It positions the candidate's work squarely in the consultancy's wheelhouse:
  exposing existing business capabilities to AI agents without a rewrite.
- Cost: a second entry point and a second transport to wire and test. Contained,
  because the tools are thin adapters over methods that are already tested.

### Alternatives considered

- **MCP tools that call the REST API over HTTP.** Adds a network hop and couples
  the agent to a running web server; the agent gets the rules transitively but
  pays latency and an extra failure mode for no gain over a direct import.
- **A separate rules engine shared by HTTP and MCP via copy.** Two
  implementations, guaranteed to diverge.
- **Skip MCP.** Meets the literal brief but discards the strongest signal for
  *this* interview.

---

## ADR-004: No hard-delete of events in the MVP

**Status:** Accepted

### Context

Standard CRUD implies a `DELETE`, but the brief lists only create, read, and
update. Deleting an event that has registrations is a real modeling question,
not just a missing endpoint. The exclusion is recorded in
[assumptions.md](./assumptions.md) and reflected in the endpoint inventory in
[domain-model.md](../.claude/core-context/domain-model.md).

### Decision

**Exclude `DELETE /api/events/:id` from the MVP.** Events are created, read, and
updated only. There is no corresponding MCP tool. The supported surface is the
endpoint inventory in
[domain-model.md](../.claude/core-context/domain-model.md).

### Consequences

- Avoids the ambiguity of **orphaned registrations**: deleting an event would
  either cascade-delete registrations (silent data loss) or leave dangling
  references that violate the `(eventId, userId)` uniqueness invariant's
  assumption that the event exists.
- Keeps the MVP honest: every endpoint maps to a rule the brief actually
  specifies.
- In a real system, the right operation is almost never a hard delete anyway —
  it is a **soft-cancel / archival** (set a `cancelled`/`archived` status,
  preserve the registration history for audit and refunds). That is the natural
  follow-up, not a `DELETE`.
- A reviewer who expects full CRUD will see this as a deliberate, documented
  choice rather than an omission.

### Alternatives considered

- **Hard delete with cascade.** Simple to implement, but destroys registration
  history and models the domain incorrectly.
- **Hard delete blocked while registrations exist.** Avoids orphans but leaves
  events undeletable in the common case, which is the same as not having delete
  — without the clear intent.
- **Soft-cancel now.** The correct production behavior, but it adds a lifecycle
  state the brief doesn't ask for; documented here as the intended next step.

---

## ADR-005: HTTP error-mapping taxonomy (400/404/409/422)

**Status:** Accepted

### Context

The service layer throws **domain errors**; the HTTP layer must translate them
to status codes consistently and precisely enough for a client or agent to act.
The canonical **domain-error → HTTP-status → MCP-error** mapping table is owned
by [domain-model.md](../.claude/core-context/domain-model.md); this ADR owns the
**rationale**, especially the 409-vs-422 distinction.

### Decision

Map domain errors to status codes on this principle:

- **400 Bad Request** — the request is *malformed*: wrong shape or invalid input
  semantics. Caught at the boundary by Zod (`ValidationError`); see
  [ADR-006](#adr-006-validate-at-the-boundary-with-shared-zod-schemas).
- **404 Not Found** — a referenced resource does not exist
  (`EventNotFoundError`, `RegistrationNotFoundError`).
- **409 Conflict** — the request is well-formed and the resources exist, but it
  conflicts with the **current state** of a resource:
  `DuplicateRegistrationError` (R3), `CapacityExceededError` (R2, event full),
  `CapacityBelowCurrentError` (update capacity below current count).
- **422 Unprocessable Entity** — the request is well-formed and semantically
  valid, but violates a **time/business rule** that no amount of fixing the
  payload changes: `PastEventError` (R1, registering for a past event).

The business rules R1–R3 are owned by [requirements.md](./requirements.md); the
error names and their triggers are owned by
[domain-model.md](../.claude/core-context/domain-model.md).

The 409-vs-422 line: **409 = "the resource's current state is in the way"**
(it's full, you're already registered, or there are already more registrants
than the new cap) — a different client, or a moment later, might succeed.
**422 = "the input is fine but the rule rejects it"** (the event is in the
past) — retrying with the same input can never succeed.

### Consequences

- Clients and agents can branch on status alone: 4xx-by-kind tells them whether
  to fix input (400), find another resource (404), retry/back off (409), or stop
  (422).
- Consistent across **both** consumers — the same taxonomy backs the MCP
  `isError` results ([ADR-003](#adr-003-ship-an-mcp-server-over-the-same-domain-layer)),
  so an agent gets the same precision as an HTTP client.
- The distinction requires discipline: new domain errors must be slotted into
  this taxonomy in [domain-model.md](../.claude/core-context/domain-model.md)
  rather than defaulting to 400 or 500.

### Alternatives considered

- **Map every business-rule violation to 409.** Simpler, but conflates
  "retry might work" (full event) with "retry can never work" (past event),
  losing actionable signal.
- **Map everything to 400.** Treats genuine state conflicts as malformed input,
  which misleads clients into editing a payload that was never the problem.
- **Use 403 for past-event.** Implies an authorization failure, which it is not;
  422 correctly says "understood, but unprocessable."

---

## ADR-006: Validate at the boundary with shared Zod schemas

**Status:** Accepted

### Context

Two consumers accept untrusted input: HTTP route handlers and MCP tools. The
domain services assume inputs are already shape-valid so they can focus on
*business* invariants, not parsing. Where validation lives is owned by
[architecture.md](./architecture.md); this ADR records the decision.

### Decision

Define each input schema **once** in `lib/validation` with **Zod**, and share it
between the route handlers and the MCP tools.

- Route handlers parse the request body/params with the schema before calling a
  service. A parse failure becomes `ValidationError → 400` (see
  [ADR-005](#adr-005-http-error-mapping-taxonomy-400404409422)).
- MCP tools validate their arguments with the **same** schema before calling the
  same service (see
  [ADR-003](#adr-003-ship-an-mcp-server-over-the-same-domain-layer)).
- Services receive already-validated input and enforce only business rules
  (capacity, uniqueness, past-event). They never re-parse shapes.

This is the **"one definition, two consumers"** pattern applied to validation,
mirroring the service-layer sharing in ADR-003.

### Consequences

- Shape validation lives in one place; HTTP and MCP cannot drift on what a valid
  payload is.
- Services stay pure and testable against typed inputs — the Vitest suite targets
  business rules, not parsing.
- Zod's inferred types feed TypeScript, so the validated shape and the static
  type are one artifact. A new field means editing one schema, which both
  consumers pick up.

### Alternatives considered

- **Validate inside each handler/tool ad hoc.** Duplicated, drift-prone, and
  pushes parsing concerns into business logic.
- **Validate only at HTTP and let MCP trust its caller.** An agent is untrusted
  input too; trusting it would let malformed tool calls reach the services.
- **A different validator per consumer.** Two schemas to keep in sync — the same
  drift problem ADR-003 exists to prevent.

---

## ADR-007: Reskin to the Origin Digital brand language — light-only

**Status:** Accepted

### Context

DevHub's original skin was a **developer-tool-dark** aesthetic — a dark IDE/terminal mood,
monospace metadata, command-bar (`▸ new`) and `this_week()` motifs, and `SOLD OUT` / `ENDED`
status labels. The project's thesis, recorded in [theme.md](./theme.md), is "a reusable
events engine with a **skin** on top," which makes the skin a legitimately documented
decision rather than an incidental style choice. A later high-fidelity design handoff
specified a different brand language (Origin Digital): a warm light theme with a single
earned accent. This ADR records adopting it; the full visual spec is owned by
[theme.md](./theme.md).

### Decision

Replace the dark skin with **Origin Digital's brand language as a presentation-only swap**,
scoped **light-only**:

- A warm **light** theme (off-white `#F6F6F1` page, white cards, near-black `#18180F` text).
  The dark theme and the `localStorage` theme toggle the handoff sketched were **deliberately
  cut** — `app/globals.css` ships only the `:root` light tokens.
- **One earned neon-lime accent** (`#C7F94E`) used as a **fill only**; accent text, icons, and
  borders use a deep **accent-ink** green (`#4B6B0F`). Never lime text on light (contrast).
- **Space Grotesk** (sans, tabular numerals) + **Newsreader** (serif, chapter reader only) via
  `next/font`; **no monospace**. Icons via **lucide-react** (no text glyphs).
- Status vocabulary **OPEN / FULL / PAST** (was OPEN / SOLD OUT / ENDED).
- Create / edit talk moved from the `/events/new` and `/events/[id]/edit` routes into a
  **modal**; the old routes now redirect.

### Consequences

- The **domain model, REST API, MCP tools, services, and the 32 tests are untouched** — an
  entire visual-language and theme-scope change touched only presentation (`app/`,
  `app/_components/`, `app/_content/`, `app/globals.css`). This is the strongest possible
  evidence for the "one core, swappable skin" claim the architecture rests on
  ([ADR-002](#adr-002-in-memory-store-is-single-instance-by-design),
  [ADR-003](#adr-003-ship-an-mcp-server-over-the-same-domain-layer)).
- Light-only is simpler to ship and review than a dual-theme toggle, and matches the brand.
- The skin's content (seed talks, walkthrough chapters) and copy are presentation concerns
  carrying no business logic.

### Alternatives considered

- **Keep the dark theme as an opt-in alongside light.** Rejected — light-only removes the
  toggle and its persistence, is simpler to review, and matches the brand brief; a second
  theme is dead weight for a take-home.
- **Keep the route-based create/edit forms.** Rejected in favor of the lower-friction modal
  the handoff specifies; the old routes redirect so deep links don't break.
- **Restyle in place (swap colors only).** Rejected — the handoff changed layout, typography,
  iconography, and vocabulary, not just the palette; a token-only remap would leave the IDE
  structure and monospace behind.
