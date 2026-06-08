// Greenroom MCP server — exposes the event API as agent tools over stdio, importing the
// SAME pure domain/service layer the HTTP route handlers use. One rule-set, two consumers.
//
// This is a separate process from the Next.js server, so it has its OWN in-memory store
// instance (single-instance by design — see docs/decisions.md ADR-002). Run: `npm run mcp`.
//
// stdout is the JSON-RPC protocol channel; all logging goes to stderr.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerEventTools } from './tools/events';
import { registerRegistrationTools } from './tools/registrations';

async function main(): Promise<void> {
  const server = new McpServer({ name: 'greenroom-events', version: '1.0.0' });

  registerEventTools(server); // create/list/get/update event
  registerRegistrationTools(server); // register/unregister/list registrations

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Greenroom MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start Greenroom MCP server:', error);
  process.exit(1);
});
