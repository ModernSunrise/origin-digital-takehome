// Event tools — thin adapters over the SAME event-service the REST route handlers call.
// Input schemas are the SAME shared Zod schemas (folded into a flat tool input where a
// path param like :id is involved). One rule-set, two consumers.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CreateEventSchema, EventIdSchema, UpdateEventSchema } from '@/lib/validation/schemas';
import { createEvent, getEvent, listEvents, updateEvent } from '@/lib/domain/event-service';
import { jsonResult, toToolError } from '../errors';

// Fold the path-style :id into the flat tool input, reusing the shared field schemas.
const UpdateEventToolInput = z.object({ ...EventIdSchema.shape, ...UpdateEventSchema.shape });

export function registerEventTools(server: McpServer): void {
  server.registerTool(
    'create_event',
    {
      title: 'Create Event',
      description:
        'Create a tech talk. `date` is an ISO-8601 UTC instant; `maxCapacity` is a positive integer. Returns the created event with derived seat counts.',
      inputSchema: CreateEventSchema,
    },
    async (input) => {
      try {
        return jsonResult(await createEvent(input));
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'list_events',
    {
      title: 'List Events',
      description: 'List all tech talks with their seat counts.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return jsonResult(await listEvents());
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'get_event',
    {
      title: 'Get Event',
      description: 'Fetch one tech talk by id.',
      inputSchema: EventIdSchema,
    },
    async ({ id }) => {
      try {
        return jsonResult(await getEvent(id));
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'update_event',
    {
      title: 'Update Event',
      description:
        'Update a tech talk (partial). Rejected if it would lower capacity below the current seat count.',
      inputSchema: UpdateEventToolInput,
    },
    async ({ id, ...patch }) => {
      try {
        return jsonResult(await updateEvent(id, patch));
      } catch (error) {
        return toToolError(error);
      }
    },
  );
}
