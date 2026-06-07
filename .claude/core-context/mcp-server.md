# MCP Server

AI-facing build reference for the MCP server. Terse and directive. The MCP
server is the project's differentiator: it exposes the event API as agent tools
that import the **same** pure domain/service layer the HTTP route handlers use.
One rule-set, two consumers.

For the canonical contract (entity types, invariants, service signatures, the
domain-error -> HTTP-status -> MCP-error table, the endpoint/service/tool table)
see [domain-model.md](./domain-model.md). For the layered design and request
lifecycle see [../../docs/architecture.md](../../docs/architecture.md). For the
rationale (why an MCP server at all) see ADR-003 in
[../../docs/decisions.md](../../docs/decisions.md).

---

## Core principle: one service layer, two consumers

```
                 lib/domain  (PURE — no HTTP, no MCP, no I/O)
                 EventService · RegistrationService · store
                  ▲                                  ▲
                  │ imports                           │ imports
        app/api/**  (Route Handlers)        mcp/  (MCP tools)
        HTTP consumer                       agent consumer
```

Rules:

- **Do** import `EventService` / `RegistrationService` from `lib/domain`
  directly. The MCP tool layer is as thin as a route handler.
- **Do** import the **shared** Zod schemas from `lib/validation` — the same ones
  the route handlers use. Never redefine input shapes here.
- **Never** put business logic in a tool handler. Validate input, call the
  service, map the outcome to a `CallToolResult`. Nothing else.
- **Never** let the MCP server reach into the in-memory store directly. Go
  through the services so invariants stay enforced in one place.
- The MCP process is a separate process from the Next.js server, but both load
  the same `lib/domain` modules. Each process has its **own** in-memory store
  instance (single-instance-by-design; see ADR-002). Do not assume shared state
  across the HTTP and MCP processes.

---

## Tool inventory

Tools mirror service methods 1:1. Names are `snake_case` (MCP convention).
Inputs are the shared Zod schemas from `lib/validation`. The mapping of tool ->
endpoint -> service method is canonical in
[domain-model.md](./domain-model.md); this table is the agent-facing view.

| Tool                       | Service method                              | Input schema (shared)        | Returns on success                  |
| -------------------------- | ------------------------------------------- | ---------------------------- | ----------------------------------- |
| `create_event`             | `EventService.createEvent`                  | `CreateEventSchema`                   | the created `EventView`              |
| `list_events`              | `EventService.listEvents`                   | `z.object({})`                        | `EventView[]`                        |
| `get_event`                | `EventService.getEvent`                     | `EventIdSchema`                       | the `EventView`                      |
| `update_event`             | `EventService.updateEvent`                  | `EventIdSchema` + `UpdateEventSchema` | the updated `EventView`              |
| `register_for_event`       | `RegistrationService.register`              | `EventIdSchema` + `RegisterSchema`    | the created `Registration`           |
| `unregister_from_event`    | `RegistrationService.unregister`            | `EventIdSchema` + `UserIdSchema`      | confirmation only, no entity (≈ 204) |
| `list_event_registrations` | `RegistrationService.listRegistrationsForEvent` | `EventIdSchema`                   | `Registration[]`                     |

Notes:

- `EventView` = stored `Event` + derived `registrationCount` / `availableCapacity`;
  canonical in [domain-model.md](./domain-model.md). `unregister_from_event` mirrors
  the service's `void` return / HTTP `204` — return a success result with no entity body.
- `create_event`, `update_event`, `register_for_event` reuse the **exact**
  schemas the corresponding route handlers parse — see `lib/validation` and the
  [api/route-handlers](../rules/api/route-handlers.md) rule.
- For path-style inputs (`:id`, `:userId`) the schema folds the path params into
  the tool's flat input object (e.g. `update_event` input = `{ id, ...patch }`).
- `list_events` takes no parameters; declare it `inputSchema: z.object({})`
  (required by the SDK; never omit).

---

## Error surfacing

Services throw the domain errors defined in
[domain-model.md](./domain-model.md). The tool layer catches them and returns a
tool error — **not** a thrown/protocol error — so the calling agent can read the
message and self-correct.

Rules:

- **Input-shape validation is the SDK's job, not ours.** The SDK validates each call
  against the tool's shared Zod `inputSchema` and rejects malformed input with a
  protocol-level `InvalidParams` (-32602) error *before* the handler runs — there is no
  `[VALIDATION]` isError path. Tool handlers only catch errors the *services* throw.
- **Do** return `{ content: [{ type: 'text', text }], isError: true }` for every
  domain error. The text carries the error **name and its stable code** so the
  agent gets a machine-recognizable token, e.g.
  `"PastEventError [PAST_EVENT]: ... registration is closed"`.
- **Never** map domain errors to HTTP status codes here. Status codes are the
  route-handler concern. For MCP the domain error name/code is the contract; the
  status column in the domain-model error table is HTTP-only.
- **Never** surface unexpected/unknown errors verbatim — log to **stderr**, return
  a generic `isError` message. Only the known taxonomy gets a descriptive message.
- Success results are returned as JSON **text** via a `jsonResult(data)` helper
  (one uniform shape for both objects and arrays). We do not declare an
  `outputSchema`, so we return `content`, not `structuredContent`.

A single `errors.ts` defines `jsonResult(data)` (success) and `toToolError(err)`
(known domain error -> descriptive `isError`; unknown -> generic). Every tool
handler returns one of these from its `try`/`catch`.

---

## SDK reference shape

Target package: `@modelcontextprotocol/sdk` (official TS SDK). `McpServer` +
`registerTool` (config-object style) + `StdioServerTransport`. Inputs are
`z.object(...)` Standard Schemas. Verify the installed version's exports before
building; the shape below is the current `registerTool(name, config, cb)` API.

> The code blocks below are **illustrative reference shapes**, not a literal copy of the
> shipped files — the authoritative tool descriptions and wiring live in `mcp/tools/*.ts`
> and `mcp/server.ts`.

### Server setup (`mcp/server.ts`)

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerEventTools } from './tools/events';
import { registerRegistrationTools } from './tools/registrations';

async function main(): Promise<void> {
  const server = new McpServer({ name: 'devhub-events', version: '1.0.0' });
  registerEventTools(server);        // create/list/get/update event
  registerRegistrationTools(server); // register/unregister/list registrations
  const transport = new StdioServerTransport();
  await server.connect(transport);   // stdout is the protocol channel; logging -> stderr
}
main().catch((err) => {
  console.error('Failed to start DevHub MCP server:', err);
  process.exit(1);
});
```

### Tool registration (`mcp/tools/events.ts`)

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CreateEventSchema, EventIdSchema } from '@/lib/validation/schemas';
import { createEvent, getEvent } from '@/lib/domain/event-service'; // named async fns, not a class
import { jsonResult, toToolError } from '../errors';

export function registerEventTools(server: McpServer): void {
  server.registerTool(
    'create_event',
    {
      title: 'Create Event',
      description: 'Create a tech talk. date is ISO-8601 UTC; maxCapacity > 0.',
      inputSchema: CreateEventSchema, // SAME z.object the POST /api/events handler parses
    },
    async (input) => {
      try {
        return jsonResult(await createEvent(input));
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.registerTool(
    'get_event',
    { title: 'Get Event', description: 'Fetch one tech talk by id.', inputSchema: EventIdSchema },
    async ({ id }) => {
      try {
        return jsonResult(await getEvent(id)); // throws EventNotFoundError
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  // list_events (inputSchema: z.object({})) and update_event follow the same pattern.
  // Tools that fold a path param into the input build a flat schema from the shared
  // shapes, e.g. z.object({ ...EventIdSchema.shape, ...UpdateEventSchema.shape }).
}
```

### Error mapping helper (`mcp/errors.ts`)

```ts
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DomainError } from '@/lib/domain/errors'; // base class for the error taxonomy

/** Success: the payload as pretty JSON text (uniform for objects and arrays). */
export function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function toToolError(err: unknown): CallToolResult {
  if (err instanceof DomainError) {
    return {
      content: [{ type: 'text', text: `${err.name} [${err.code}]: ${err.message}` }],
      isError: true,
    };
  }
  console.error('Unhandled error in MCP tool:', err); // unknown: do not leak internals
  return { content: [{ type: 'text', text: 'Internal error' }], isError: true };
}
```

---

## Conventions

- Tool naming, registration order, and the thin-handler shape are enforced by
  the [mcp/tool-conventions](../rules/mcp/tool-conventions.md) rule (paths:
  `mcp/**`).
- When you add a capability, add the tool in the **same** change as the service
  method and route handler, and update the tool/endpoint table in
  [domain-model.md](./domain-model.md). The full cross-consumer workflow is the
  [add-endpoint skill](../skills/add-endpoint/SKILL.md).
- Transport is stdio (local agent / desktop client spawns the process). Do not
  add an HTTP transport for the MVP; that is a future-work item alongside the
  Azure productionization path (ADR-002).
