// MCP-only glue: turn service results and thrown domain errors into CallToolResults.
// Mirrors the role app/api/_lib/http.ts plays for HTTP, but the MCP "dialect" is a tool
// result with isError, NOT an HTTP status code (status codes are HTTP-only).

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DomainError } from '@/lib/domain/errors';

/** Success: the payload as pretty JSON text (handles both objects and arrays uniformly). */
export function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/**
 * Map a thrown domain error to a tool error the calling agent can read and self-correct
 * on. The error name + stable code are embedded in the text so an agent can branch on a
 * machine-recognizable token. Unknown errors are never leaked.
 */
export function toToolError(error: unknown): CallToolResult {
  if (error instanceof DomainError) {
    return {
      content: [{ type: 'text', text: `${error.name} [${error.code}]: ${error.message}` }],
      isError: true,
    };
  }
  console.error('Unhandled error in MCP tool:', error);
  return { content: [{ type: 'text', text: 'Internal error' }], isError: true };
}
