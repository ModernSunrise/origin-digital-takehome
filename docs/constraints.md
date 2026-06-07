# Constraints

This document records the **limits** within which this system is built — both
constraints **imposed by the exercise** and constraints **we chose** as a team —
together with the rationale and the downstream consequence of each. Constraints
are facts to design around, not problems to solve. Where a constraint forces a
real tradeoff, this document hands off to the relevant ADR rather than
re-arguing it here.

- Requirements that these constraints bound: [requirements.md](./requirements.md)
- Rationale and accepted tradeoffs (the "why"): [decisions.md](./decisions.md)
- Architecture that realizes these constraints: [architecture.md](./architecture.md)
- Precise contract (types, errors, endpoints): [../.claude/core-context/domain-model.md](../.claude/core-context/domain-model.md)

**Legend — Type:** *Imposed* = dictated by the take-home brief. *Chosen* = a
team decision made to satisfy the brief well.

---

## Summary

| # | Constraint | Type |
|---|------------|------|
| C1 | In-memory storage only (no database) | Imposed |
| C2 | Single-process / single-instance deployment | Consequence of C1 |
| C3 | Next.js full-stack, App Router + Route Handlers | Chosen |
| C4 | TypeScript in `strict` mode throughout | Chosen |
| C5 | Zod validation at every boundary | Chosen |
| C6 | Vitest as the test runner; tests target the service layer | Chosen |
| C7 | No authentication (out of scope); user is a plain identifier | Imposed |
| C8 | Single repository, one deployable unit | Chosen |

---

## C1 — In-memory storage only

| | |
|---|---|
| **What** | All state (events, registrations) lives in process memory — `Map`s held by a singleton store module. No database, no persistence layer. |
| **Type** | Imposed by the brief. |
| **Rationale** | The exercise is about **business-rule modeling and clean layering**, not infrastructure. An in-memory store keeps the domain logic front-and-center and makes the service layer trivially testable. |
| **Consequence** | State is **volatile**: a process restart wipes all data. The store exposes a `resetStore` seam used **only by tests** for isolation (see [domain-model.md](../.claude/core-context/domain-model.md)). It also directly causes **C2** below. |

This is the central constraint of the system. We do not treat it as a wart to
hide; we treat it as a deliberate MVP boundary that defines a clean **seam** for
productionization. The lead-in to that path is **C2**.

---

## C2 — Single-process / single-instance deployment

| | |
|---|---|
| **What** | Because state lives in one process's memory, the application is correct **only when run as a single instance**. Horizontal scaling (multiple replicas behind a load balancer) would split state across processes and break every business rule that reasons over shared state (capacity, duplicate detection). |
| **Type** | Direct **consequence of C1**, not an independent choice. |
| **Rationale** | Acknowledged, not fought. For an in-memory MVP, single-instance is the **only** coherent topology — and saying so plainly is more honest than pretending otherwise. |
| **Consequence** | No horizontal scale; no zero-downtime rolling restart without losing state. This is the **accepted tradeoff** and the natural lead-in to the production story. |

This constraint is the **bridge to the Azure productionization path**. The fix is
not to bolt persistence onto the MVP — it is to swap the store implementation
behind its existing interface (Cosmos DB), deploy as an Azure Container App, add
CI/CD, and introduce an Entra ID auth seam. That entire argument lives in
[decisions.md → ADR-002](./decisions.md), which this constraint defers to in full.

---

## C3 — Next.js full-stack (App Router + Route Handlers)

|                 |                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**        | One Next.js application provides both the REST API (App Router **Route Handlers** under `app/api/**`) and the React frontend.                                                                                                                                                                                                                                    |
| **Type**        | Chosen, to satisfy the brief's "REST API + frontend" with one stack.                                                                                                                                                                                                                                                                                             |
| **Rationale**   | A single framework for both surfaces minimizes ceremony, shares TypeScript types end-to-end, and keeps the repo small enough to read in a sitting. Route Handlers give us a thin, standards-based HTTP layer.                                                                                                                                                    |
| **Consequence** | Route handlers must stay **thin** — parse, call a service, map errors — with **no business logic** (enforced by [../.claude/rules/api/route-handlers.md](../.claude/rules/api/route-handlers.md)). The MCP server lives alongside but imports the **same** service layer rather than going over HTTP. Architecture detail: [architecture.md](./architecture.md). |

---

## C4 — TypeScript `strict` mode throughout

|                 |                                                                                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**        | `strict: true` across the whole codebase — domain, route handlers, MCP server, frontend, and tests.                                                                                                                                                            |
| **Type**        | Chosen.                                                                                                                                                                                                                                                        |
| **Rationale**   | The domain model leans on precise types (UUIDs, ISO-8601 datetimes, positive-integer capacity, a closed domain-error taxonomy). Strict typing makes those invariants checkable at compile time and makes the "one type definition, two consumers" design safe. |
| **Consequence** | No implicit `any`, no unchecked nullability. Shapes are defined **once** and reused; runtime narrowing at boundaries is delegated to Zod (**C5**). Conventions: [../.claude/rules/general/typescript.md](../.claude/rules/general/typescript.md).              |

---

## C5 — Zod validation at every boundary

| | |
|---|---|
| **What** | All untrusted input (HTTP request bodies/params, MCP tool arguments) is validated by **Zod** schemas before reaching a service. Schemas are defined **once** (e.g. `lib/validation`) and shared by both consumers. |
| **Type** | Chosen. |
| **Rationale** | Validation belongs at the edge so the **pure** service layer can assume well-formed input and concern itself only with business rules. Sharing one schema set between Route Handlers and MCP tools is another "one definition, two consumers" win. |
| **Consequence** | A Zod failure maps to a `ValidationError` → **400** before any service runs; the service layer never re-checks input **shape** (it still enforces business **semantics**). Rationale and the boundary-validation decision: [decisions.md → ADR-006](./decisions.md). Error mapping: [domain-model.md](../.claude/core-context/domain-model.md). |

---

## C6 — Vitest; tests target the service layer

| | |
|---|---|
| **What** | **Vitest** is the test runner. Unit tests exercise the **service layer directly** (not over HTTP), resetting the store between tests. |
| **Type** | Chosen. |
| **Rationale** | The business rules are the point of the exercise, and they live in pure services. Testing services directly is faster, more precise, and free of HTTP/transport noise — and it proves the rules hold regardless of which consumer (HTTP or MCP) invokes them. |
| **Consequence** | Required coverage includes the three business rules and their edges (capacity-below-count, unregister-frees-slot, not-registered, not-found). Test conventions and the required matrix: [../.claude/rules/testing/service-tests.md](../.claude/rules/testing/service-tests.md); requirements list them as NFRs in [requirements.md](./requirements.md). |

---

## C7 — No authentication (out of scope)

| | |
|---|---|
| **What** | There is **no auth, identity, or authorization**. A "user" is simply an identifier **string** (email or name) supplied in the request body / tool input. |
| **Type** | Imposed by the brief ("Auth is out of scope"). |
| **Rationale** | Auth would dominate the exercise without exercising the business rules. Treating the user as an opaque string keeps registration logic (uniqueness, capacity) intact while leaving a clean **seam** for real identity later. |
| **Consequence** | The `userId` is trusted as-is and is **not** verified against any account. Registration uniqueness is `(eventId, userId)`. The future identity story (Entra ID) plugs into this seam — see [decisions.md → ADR-002](./decisions.md). The user-as-string assumption and its blast radius if violated: [assumptions.md](./assumptions.md). |

---

## C8 — Single repository, one deployable unit

| | |
|---|---|
| **What** | API, frontend, domain layer, and MCP server live in **one repo** and (for the MVP) one deployable Next.js process, with the MCP server runnable from the same codebase. |
| **Type** | Chosen. |
| **Rationale** | Keeps the shared domain/service layer trivially importable by both the Route Handlers and the MCP server with no package boundaries to manage. Reinforces the headline design: **one rule-set, two consumers**. |
| **Consequence** | No cross-package versioning; the MCP server and HTTP API can never drift on business rules because they import the **same** modules. The MCP differentiator is detailed in [decisions.md → ADR-003](./decisions.md) and [../.claude/core-context/mcp-server.md](../.claude/core-context/mcp-server.md). |

---

## How these constraints relate

- **C1 → C2** is the only causal chain here: in-memory storage *forces* single-instance. Everything downstream of that (Azure, Cosmos DB, Container Apps) is a **decision**, not a constraint, and lives in [decisions.md → ADR-002](./decisions.md).
- **C3–C6, C8** are mutually reinforcing **choices** that all serve one goal: keep business rules in a pure, well-typed, well-tested service layer that two transports consume.
- **C7** is an imposed boundary we turned into a clean extension seam.

For the precise types, invariants, and the domain-error → HTTP-status mapping that
these constraints operate on, see the canonical
[domain-model.md](../.claude/core-context/domain-model.md).
