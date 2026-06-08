# Event Management API — Project Index

An Event Management **REST API + React frontend + MCP server** in one Next.js app, for
an Origin Digital take-home. The exercise's real subject is architecture: the three
business rules live **once** in a pure domain layer, and two thin adapters (HTTP route
handlers and MCP tools) expose it. **One rule-set, two consumers.**

> This file is a lean **index**, not an encyclopedia — per the project's own
> context-engineering method. It *links*; it does not duplicate. If you want detail,
> follow the link. If you're tempted to paste a table or a signature here, it belongs in
> a `core-context` or `rules` file instead. Keep this under ~300 lines.

---

## Stack

Next.js (App Router) · TypeScript (`strict`) · Zod (boundary validation) · Vitest ·
`@modelcontextprotocol/sdk`. Single repo, **single process**, **in-memory** storage by
design. Auth is out of scope.

**Theme:** [DevHub](./docs/theme.md) — an internal tech-talk hub, reskinned in Origin
Digital's brand language: a warm **light** theme (light-only — no dark mode or theme
toggle), one earned neon-lime accent, Space Grotesk + Newsreader, lucide icons. A
presentation skin over the generic events core; domain/API/tool names are unchanged.

## Commands

These are the project's npm scripts, wired into `package.json`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (frontend + REST API). |
| `npm run test` | Vitest unit tests — the service layer (the business rules). |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run typecheck` | `tsc --noEmit` (strict). |
| `npm run lint` | ESLint. |
| `npm run mcp` | Start the MCP server over stdio. |

---

## Architecture — hard constraints

These are non-negotiable; they are the point of the exercise. Each links to the rule
that enforces it. Full design: [docs/architecture.md](./docs/architecture.md).

- **Business rules live ONLY in `lib/domain`.** The domain/service layer is pure — no
  `next`, no HTTP types, no MCP SDK, no I/O beyond the store. → [service-layer-purity](./.claude/rules/domain/service-layer-purity.md)
- **Route handlers and MCP tools are THIN.** Parse with the shared Zod schema → call one
  service → map the result/error. No business logic in an adapter. → [route-handlers](./.claude/rules/api/route-handlers.md) · [tool-conventions](./.claude/rules/mcp/tool-conventions.md)
- **One shared Zod schema set feeds BOTH consumers** (`lib/validation`). Never write a
  second schema for the other surface. → [ADR-006](./docs/decisions.md)
- **Services are `async`; the store is the only swappable persistence module.** This is
  the deliberate Cosmos DB seam — signatures don't change when the store does. → [domain-model](./.claude/core-context/domain-model.md)
- **Tests target services directly**, never HTTP; `resetStore()` between tests. → [service-tests](./.claude/rules/testing/service-tests.md)
- **No `DELETE /api/events/:id`.** Hard-delete is excluded from the MVP. → [ADR-004](./docs/decisions.md)

### Do / Don't

| Do | Don't |
| --- | --- |
| Put every rule in a service and throw a typed domain error. | Put an `if` that decides a rule in a handler or tool. |
| Import the shared Zod schema in both consumers. | Redefine an input shape per consumer. |
| `await` services; map domain errors at the edge. | Map errors to HTTP status inside `lib/domain`. |
| Update REST **and** MCP in the same change. | Let the two consumers drift. |
| Keep derived counts computed on read. | Store `registrationCount` as mutable truth. |

---

## Context map

The context system follows a three-layer schema (index → rules → on-demand deep context),
plus human-facing design docs. Where to look:

| Layer | Location | Loaded | What's there |
| --- | --- | --- | --- |
| **Index** | this `CLAUDE.md` | always | Table of contents + hard constraints + gotchas. |
| **Rules** | [`.claude/rules/`](./.claude/rules/) | auto, by file path | Terse, enforceable conventions (one concern each). |
| **Deep context** | [`.claude/core-context/`](./.claude/core-context/README.md) | on demand | Canonical, buildable spec. |
| **Skill** | [`add-endpoint`](./.claude/skills/add-endpoint/SKILL.md) | on demand / slash | The cross-consumer change workflow. |
| **Design docs** | [`docs/`](./docs/) | human-facing | The *why*: requirements, constraints, assumptions, architecture, decisions. |
| **Issues** | [`.claude/issues/`](./.claude/issues/TEMPLATE.md) | on demand | Solved-bug memory (root cause + fix). |

**Canonical sources** (single source of truth — link, don't restate):
- Precise contract — types, invariants, service signatures, the error→HTTP→MCP table,
  the endpoint↔service↔tool table: [`.claude/core-context/domain-model.md`](./.claude/core-context/domain-model.md)
- MCP server design: [`.claude/core-context/mcp-server.md`](./.claude/core-context/mcp-server.md)
- The "why" for every decision (ADRs): [`docs/decisions.md`](./docs/decisions.md)

Design docs: [requirements](./docs/requirements.md) ·
[constraints](./docs/constraints.md) · [assumptions](./docs/assumptions.md) ·
[architecture](./docs/architecture.md) · [decisions](./docs/decisions.md) ·
[theme](./docs/theme.md).

---

## Critical gotchas

- **In-memory = single instance per process.** The Next.js server and the MCP server are
  separate processes and do **not** share state. By design ([ADR-002](./docs/decisions.md)).
- **The store is a module singleton.** Tests must call `resetStore()` in `beforeEach` or
  state leaks across them (see [issues/TEMPLATE.md](./.claude/issues/TEMPLATE.md) for the
  worked example).
- **Services are `async` by design** even though the in-memory store resolves
  synchronously — `await` them everywhere. This preserves the persistence seam.
- **`date` is ISO-8601 UTC**; the past-event check (R1) compares against server `now`.
  See [assumptions](./docs/assumptions.md).

## Conventions

- Code quality (strict types, no `var`/`any`, no classes-in-methods, named imports,
  immutability): [code-quality](./.claude/rules/general/code-quality.md) ·
  [typescript](./.claude/rules/general/typescript.md).
- Naming: `camelCase` functions, `PascalCase` types/errors, `snake_case` MCP tools.
- Domain services are **module namespaces of named async functions**, not classes.

## Changing the API surface

Use the [`add-endpoint`](./.claude/skills/add-endpoint/SKILL.md) skill. Golden order:
domain → service → validation → tests → REST adapter → MCP adapter → docs. Update both
consumers and the tables in `domain-model.md` in the same change.

---

## Status

Context system complete, theme defined ([DevHub](./docs/theme.md)), and the application
**built**: the pure domain layer, the REST + MCP consumers, the 32 service tests, and the
front-end — reskinned into Origin Digital's **light** brand language (light-only; the dark
theme and theme toggle were dropped — see [ADR-007](./docs/decisions.md)). The root
`README.md` carries the in-memory → Azure Cosmos DB / Container Apps / CI-CD / Entra ID
productionization narrative.
