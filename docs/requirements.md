# Requirements — Event Management API

This document captures **what** the system must do (functional) and the **qualities** it must exhibit (non-functional). It is the human-facing entry point for the exercise. For the precise data contract, types, and error mappings see [`../.claude/core-context/domain-model.md`](../.claude/core-context/domain-model.md). For the reasoning behind key choices see [`./decisions.md`](./decisions.md).

Related reading:
- [`./constraints.md`](./constraints.md) — imposed/accepted limits and their consequences.
- [`./assumptions.md`](./assumptions.md) — explicit assumptions and their impact if wrong.
- [`./architecture.md`](./architecture.md) — layered design, request lifecycles, and folder structure.

---

## 1. Problem Statement

Build an **Event Management** system: a REST API plus a frontend for creating and viewing events and for registering/unregistering users. The substance of the exercise is **three business rules** enforced in a **pure domain layer**, surfaced to **two consumers**: an HTTP API and an MCP server. There is no database; storage is in-memory by design (see [ADR-002](./decisions.md)).

---

## 2. Functional Requirements

### 2.1 Events

| ID | Requirement |
|----|-------------|
| FR-1 | The system shall create an event with `title` (non-empty), `description` (may be empty), `date` (single start datetime, UTC), and `maxCapacity` (positive integer). |
| FR-2 | The system shall list all events. |
| FR-3 | The system shall retrieve a single event by `id`. |
| FR-4 | The system shall update an event's mutable fields (`title`, `description`, `date`, `maxCapacity`) via partial update. |
| FR-5 | The system shall expose, for each event, a derived `registrationCount` and `availableCapacity` computed from current registrations — never stored as independent mutable truth. |

### 2.2 Registrations

| ID | Requirement |
|----|-------------|
| FR-6 | The system shall register a user (identified by `userId`) for an event. |
| FR-7 | The system shall unregister a user from an event, freeing a capacity slot immediately. |
| FR-8 | The system shall list the registrations for an event. |

### 2.3 Business Rules (the heart of the exercise)

These are the rules the domain layer must enforce; they are first-class requirements, not implementation details. Enforcement points and error types are specified canonically in [`../.claude/core-context/domain-model.md`](../.claude/core-context/domain-model.md); the HTTP/MCP error mapping rationale lives in [ADR-005](./decisions.md).

| ID | Rule | Outcome |
|----|------|---------|
| FR-9  | **(R1)** A user shall not register for an event whose `date` is in the past relative to server time. | The registration is rejected with a clear error. |
| FR-10 | **(R2)** A registration shall not be accepted when the event is at `maxCapacity`. | The registration is rejected with a clear error. |
| FR-11 | **(R3)** A user shall not be registered twice for the same event; `(eventId, userId)` is unique. | The registration is rejected with a clear error. |
| FR-12 | An event's `maxCapacity` shall not be updated below its current `registrationCount`. | The update is rejected with a clear error. |
| FR-13 | Unregistering a user who is not registered shall be rejected. | The request is rejected with a clear error. |

The specific domain error class and HTTP status for each outcome are owned by [`../.claude/core-context/domain-model.md`](../.claude/core-context/domain-model.md); the status-code reasoning is in [ADR-005](./decisions.md).

### 2.4 Validation

| ID | Requirement |
|----|-------------|
| FR-14 | The system shall validate all request input at the boundary with Zod, returning a clear `ValidationError` (HTTP 400) for malformed/semantically invalid input. Schemas are defined once and shared by both consumers (see [ADR-006](./decisions.md)). |

### 2.5 Two Consumers (one rule-set)

| ID | Requirement |
|----|-------------|
| FR-15 | The system shall expose the full event/registration capability over a **REST API** (Next.js App Router Route Handlers). |
| FR-16 | The system shall expose the same capability over an **MCP server** whose tools import the **same** domain/service layer and the **same** Zod schemas as the REST handlers (see [ADR-003](./decisions.md)). |
| FR-17 | A **frontend** shall allow a user to manage events (create, list, view, edit) and registrations (register, unregister, view) against the REST API. |

### 2.6 Testing

| ID | Requirement |
|----|-------------|
| FR-18 | The system shall include Vitest unit tests targeting the **service layer directly** (not HTTP), covering R1, R2, R3, capacity-below-count (FR-12), the slot-freed-on-unregister flow, unregister-when-not-registered (FR-13), and not-found paths. Test isolation uses the store `reset` seam. |

---

## 3. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | **Storage:** In-memory only — no database. This makes the system single-instance by design; see [`./constraints.md`](./constraints.md) and [ADR-002](./decisions.md) for the consequence and the Azure productionization path. |
| NFR-2 | **Architecture:** Business rules live in a pure domain/service layer with **no HTTP dependency**; route handlers and MCP tools are thin adapters. See [`./architecture.md`](./architecture.md). |
| NFR-3 | **Type safety:** TypeScript in `strict` mode throughout. |
| NFR-4 | **Boundary validation:** Untrusted input is validated with Zod before reaching a service; services may assume well-typed input. |
| NFR-5 | **Time semantics:** `date` is stored and compared as UTC; the past-event check is against server "now" (see [`./assumptions.md`](./assumptions.md)). |
| NFR-6 | **Error mapping:** Domain errors map to deterministic HTTP status codes (400/404/409/422); the canonical table lives in [`../.claude/core-context/domain-model.md`](../.claude/core-context/domain-model.md). |
| NFR-7 | **Testability:** The service layer is unit-testable in isolation, with a deterministic store-reset seam between tests. |
| NFR-8 | **Single repo, single process:** One Next.js project hosts the frontend, REST API, and (alongside) the MCP server. |

---

## 4. Scope

### 4.1 In Scope
- Event create / list / read / update.
- Registration register / unregister / list.
- The three business rules (FR-9..FR-11) plus capacity-below-count (FR-12).
- Pure domain/service layer with in-memory store.
- REST API over Route Handlers + a React frontend.
- An MCP server over the same domain layer.
- Vitest unit tests for the business logic.

### 4.2 Out of Scope
- **Authentication / authorization.** A user is just an identifier string in the request body; this is the deliberate seam for future Entra ID auth ([ADR-002](./decisions.md)). See [`./assumptions.md`](./assumptions.md).
- **Hard-delete of events.** Excluded from the MVP to avoid orphaned registrations; real systems soft-cancel/archive. Rationale in [ADR-004](./decisions.md).
- **Persistent storage / multi-instance scale-out.** Not in the MVP; the productionization path (Cosmos DB, Container Apps, CI/CD) is documented as the lead-in in [ADR-002](./decisions.md).
- **Pagination, search, and rich filtering** on list endpoints.

---

## 5. Interface Inventory (requirements-level)

Names and one-line purposes only. The **precise** request/response contract, types, status codes, and the endpoint ↔ service ↔ tool mapping are canonical in [`../.claude/core-context/domain-model.md`](../.claude/core-context/domain-model.md).

### 5.1 REST Endpoints

| Method & Path | Purpose |
|---------------|---------|
| `POST /api/events` | Create an event. |
| `GET /api/events` | List all events. |
| `GET /api/events/:id` | Get one event. |
| `PATCH /api/events/:id` | Partially update an event. |
| `POST /api/events/:id/registrations` | Register a user for the event. |
| `DELETE /api/events/:id/registrations/:userId` | Unregister a user from the event. |
| `GET /api/events/:id/registrations` | List an event's registrations. |

> No `DELETE /api/events/:id` — hard-delete is excluded ([ADR-004](./decisions.md)).

### 5.2 MCP Tools

| Tool | Purpose |
|------|---------|
| `create_event` | Create an event. |
| `list_events` | List all events. |
| `get_event` | Get one event. |
| `update_event` | Partially update an event. |
| `register_for_event` | Register a user for an event. |
| `unregister_from_event` | Unregister a user from an event. |
| `list_event_registrations` | List an event's registrations. |

MCP design detail lives in [`../.claude/core-context/mcp-server.md`](../.claude/core-context/mcp-server.md).

---

## 6. Acceptance Criteria (summary)

The exercise is complete when: all functional requirements above are met; the three business rules plus FR-12/FR-13 are enforced in the pure service layer; both consumers (REST + MCP) drive that one layer; the frontend exercises the REST API end-to-end; and the Vitest suite (FR-18) passes, demonstrating each rule and edge case.
