# Core Context

Deep, **on-demand** reference for the Event API's complex domains. These files are the
single source of truth for the precise contract; they are pulled in only when Claude is
actually working in the relevant area — not loaded on every turn.

| File | What it is | Read it when |
| --- | --- | --- |
| [`domain-model.md`](./domain-model.md) | Canonical spec: entities, invariants, the in-memory store + reset seam, service signatures, the error→HTTP→MCP mapping table, and the endpoint↔service↔tool map. | Implementing or changing anything in `lib/domain`, a route handler, or an MCP tool. |
| [`mcp-server.md`](./mcp-server.md) | MCP server design: the tools, their shared-Zod inputs, how they reuse the **same** service layer, and how domain errors surface as tool errors. | Building or extending `mcp/`. |

**Why this layer exists:** `docs/` explains the *why* for humans; `core-context/` gives
Claude the exact, buildable *what*. The two reference each other and never duplicate —
rationale lives in [`../../docs/decisions.md`](../../docs/decisions.md), the precise
contract lives here.
