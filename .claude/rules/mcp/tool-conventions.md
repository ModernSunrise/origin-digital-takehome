---
paths:
  - "mcp/**"
description: MCP tools are thin adapters over the SAME services as the REST handlers.
---

# MCP Tool Conventions (`mcp/**`)

The MCP server is the differentiator: the SAME domain/service layer, a second consumer alongside HTTP. Tools are thin adapters, exactly like route handlers. Full design: [mcp-server](../../core-context/mcp-server.md). Architecture: [architecture](../../../docs/architecture.md).

## Core principle

- Import services from `lib/domain`. NEVER reimplement a business rule in a tool. One rule-set, two consumers. See [service-layer-purity](../domain/service-layer-purity.md).
- Each tool wraps ONE service call, mirroring a REST endpoint's semantics.

## Tool inventory (mirror the services)

`create_event`, `list_events`, `get_event`, `update_event`, `register_for_event`, `unregister_from_event`, `list_event_registrations`. Tool ↔ service ↔ endpoint table: [domain-model](../../core-context/domain-model.md).

## Input validation

- Validate tool inputs with the SHARED Zod schemas from `lib/validation` — the SAME schemas the route handlers use. Never define a parallel schema here. See [decisions](../../../docs/decisions.md) (ADR-006).
- Derive each tool's input schema from those shared schemas so the API and the agent surface cannot drift.

## The four steps a tool does

1. Validate input with the shared Zod schema.
2. Call the matching `lib/domain` service function.
3. Return the result as structured tool output (JSON-serialized entity).
4. On a thrown domain error, return an error result with `isError: true` and a clear message.

Nothing else. No rule checks, no store access.

## Errors

- Catch domain errors and surface them as MCP tool errors via `isError` content, not as transport-level crashes. The agent should see a usable error message.
- Do NOT map to HTTP status codes here; status codes are an HTTP concern. Error taxonomy: [domain-model](../../core-context/domain-model.md).
- Unexpected errors → generic `isError` message; do not leak internals.

## SDK shape

- Use the official `@modelcontextprotocol/sdk`. Register tools with name, description, and the shared-derived input schema. Setup reference: [mcp-server](../../core-context/mcp-server.md).
- Keep tool descriptions action-oriented so an agent can choose correctly.

## Semantics parity

- A tool's behavior MUST match its REST counterpart: same inputs, same rules, same outcomes. If REST rejects it, the tool rejects it identically (via the shared service + schema).
- When the API surface changes, update BOTH consumers and the tables in [domain-model](../../core-context/domain-model.md). Workflow: skill `add-endpoint`.

## Don't

- No business logic, no store mutation, no duplicated validation in `mcp/**`.
- No HTTP types or status codes.
