// Registration tools — thin adapters over the SAME registration-service the REST route
// handlers call. The three business rules live in the service; these tools never re-check
// them. Input schemas reuse the shared Zod field schemas.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EventIdSchema, RegisterSchema, UserIdSchema } from '@/lib/validation/schemas';
import { listRegistrationsForEvent, register, unregister } from '@/lib/domain/registration-service';
import { jsonResult, toToolError } from '../errors';

const RegisterToolInput = z.object({ ...EventIdSchema.shape, ...RegisterSchema.shape });
const UnregisterToolInput = z.object({ ...EventIdSchema.shape, ...UserIdSchema.shape });

export function registerRegistrationTools(server: McpServer): void {
  server.registerTool(
    'register_for_event',
    {
      title: 'Register for Event',
      description:
        'Save a seat for an attendee at a tech talk. Fails if the talk has already started, is full, or the attendee already has a seat.',
      inputSchema: RegisterToolInput,
    },
    async ({ id, userId }) => {
      try {
        return jsonResult(await register(id, userId));
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'unregister_from_event',
    {
      title: 'Unregister from Event',
      description: 'Release an attendee seat at a tech talk, freeing capacity immediately.',
      inputSchema: UnregisterToolInput,
    },
    async ({ id, userId }) => {
      try {
        await unregister(id, userId);
        // Confirmation only, no entity body — mirrors the service's void return / HTTP 204.
        return { content: [{ type: 'text', text: `Unregistered ${userId} from event ${id}.` }] };
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'list_event_registrations',
    {
      title: 'List Event Registrations',
      description: 'List the attendees registered for a tech talk.',
      inputSchema: EventIdSchema,
    },
    async ({ id }) => {
      try {
        return jsonResult(await listRegistrationsForEvent(id));
      } catch (error) {
        return toToolError(error);
      }
    },
  );
}
