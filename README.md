# DevHub — Event Management API & UI

A REST API and web app for scheduling internal tech talks and managing seat
registrations. Built as a take-home exercise for Origin Digital.

> **For reviewers:** a clean Next.js app — in-memory store, the three business rules
> enforced in a pure service layer with unit tests, and a polished UI. Run it with
> `npm install && npm run dev`. Everything past the core (an MCP server, design docs, an
> Azure productionization plan) is clearly labeled **[Beyond the brief]** so you can skip
> straight to what the exercise asks for.

## Quick start

Prerequisites: **Node 20+** (developed on Node 24) and npm.

```bash
npm install
npm run dev          # http://localhost:3000  — frontend + REST API
```

The app seeds a few demo talks on first load, so it's usable immediately.

```bash
npm test             # unit tests for the business logic (Vitest)
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (strict)
```

## What it does

- **Events** — create, read, and update (title, description, date, max capacity).
- **Registrations** — register / unregister an attendee for an event.
- **Business rules**, enforced server-side and unit-tested:
  - cannot register for a **past** event;
  - cannot exceed an event's **capacity**;
  - cannot **double-register** the same user for the same event.
- **Auth is out of scope** — a "user" is just an identifier string in the request body.

Storage is **in-memory by design** (no database) — see
[the tradeoff](#in-memory-by-design-and-productionizing-on-azure).

## REST API

Base path `/api`. Errors return `{ "error": { "code", "message" } }` with a mapped status.

| Method & path | Purpose | Success |
| --- | --- | --- |
| `POST /api/events` | create an event | `201` |
| `GET /api/events` | list events | `200` |
| `GET /api/events/:id` | get one event | `200` |
| `PATCH /api/events/:id` | update an event | `200` |
| `POST /api/events/:id/registrations` | register (`{ "userId": "…" }`) | `201` |
| `DELETE /api/events/:id/registrations/:userId` | unregister | `204` |
| `GET /api/events/:id/registrations` | list an event's registrations | `200` |

Status mapping: `400` invalid input · `404` not found · `409` state conflict (full,
duplicate, capacity-below-count) · `422` past-event rule. (There is no event-delete
endpoint — the brief asks only for create/read/update.)

```bash
curl -X POST localhost:3000/api/events -H 'content-type: application/json' \
  -d '{"title":"Intro to RAG on Azure","date":"2026-12-01T18:00:00.000Z","maxCapacity":40}'
```

## Architecture

One principle: **business rules live once, in a pure domain layer; the transport layers
are thin adapters.**

```
   Browser (React)            Agent (MCP client)
         │  HTTP                     │  stdio
         ▼                           ▼
   app/api/**  (route handlers)   mcp/**  (tools)     ← thin: parse → service → map error
         └─────────────┬─────────────┘
                       ▼
             lib/domain  (PURE service layer)         ← the 3 rules; throws typed errors
                       ▼
             in-memory store (singleton)              ← the swappable persistence seam
```

- **`lib/domain/`** — entity types, the domain-error taxonomy, the async in-memory store,
  and `EventService` / `RegistrationService`. No HTTP or framework imports. Every rule is
  enforced here, and this is what the unit tests target.
- **`app/api/**`** — thin route handlers: parse with a shared Zod schema, call one
  service, map domain errors to status codes. No business logic.
- **`lib/validation/`** — Zod schemas defined once and shared by the route handlers and
  the MCP tools (one definition, two consumers).
- **`app/` (UI)** — a Next.js App Router frontend that consumes the REST API via SWR.

Deeper design docs (requirements, constraints, assumptions, architecture, ADRs) live in
[`docs/`](./docs).

## Testing

`npm test` runs Vitest against the **service layer directly** — the rules are tested
where they live, not over HTTP. 32 tests cover the three business rules, the
capacity-below-count edge, the exact-capacity and exact-"now" boundaries, the
slot-frees-on-unregister flow, the rule evaluation order, not-found paths, and the shared
Zod schemas.

## Repository map

```
app/             Next.js frontend + REST route handlers (app/api/**)
lib/domain/      pure service layer + in-memory store (the business logic)
lib/validation/  shared Zod schemas
lib/client/      typed browser API client (SWR)
mcp/             MCP server                                    [Beyond the brief]
docs/            design docs: requirements, constraints, assumptions, architecture, decisions
.claude/         the context-engineering system used to build this  [Beyond the brief]
```

---

## [Beyond the brief]

The exercise asks for a REST API + UI + tests. The items below go further. They're
deliberate, and I'm happy to walk through them.

### An MCP server — one rule-set, two consumers

[`mcp/`](./mcp) exposes the same event API as **agent tools** over the Model Context
Protocol, importing the **same** `lib/domain` services and the **same** Zod schemas the
HTTP handlers use. An AI agent and the browser therefore hit identical business logic —
add a rule once and both surfaces get it.

```bash
npm run mcp          # starts the MCP server on stdio
# inspect it interactively:
npx @modelcontextprotocol/inspector npm run mcp
```

Tools: `create_event`, `list_events`, `get_event`, `update_event`, `register_for_event`,
`unregister_from_event`, `list_event_registrations`. Design notes:
[`.claude/core-context/mcp-server.md`](./.claude/core-context/mcp-server.md).

### In-memory by design, and productionizing on Azure

In-memory storage makes the app **single-instance by design** — each process owns its
store, so it doesn't scale horizontally as written. That's the right call for this
exercise, and the code is shaped so the path forward is short:

- **Persistence** — the store sits behind an async interface and the services are already
  `async`, so swapping the in-memory Maps for **Azure Cosmos DB** is a change *inside one
  module* — no service signature or caller changes.
- **Hosting** — deploy as a single-container **Azure Container App**.
- **CI/CD** — GitHub Actions: build → test → lint → deploy.
- **Auth** — the `userId`-as-string seam is exactly where **Entra ID** slots in.

Full reasoning: [`docs/decisions.md`](./docs/decisions.md) (ADR-002).

### Design docs & the context system

[`docs/`](./docs) holds the human-facing design docs (including ADRs). [`.claude/`](./.claude)
is the **context-engineering system** I used to drive the build with Claude Code — a lean
index, path-scoped rules, deep-context references, and a workflow skill. It documents *how*
the project was built; it isn't needed to run or evaluate the app.

## Assumptions

A user is an identifier string (auth out of scope); event `date` is a single UTC start
instant; the past-event check is against server time; unregistering frees a seat
immediately; reducing capacity below the current registration count is rejected; event
hard-delete is intentionally excluded. Rationale: [`docs/assumptions.md`](./docs/assumptions.md).
