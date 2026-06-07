// Shared Zod schemas — defined ONCE, consumed by BOTH the REST route handlers and the
// MCP tools (one definition, two consumers; see docs/decisions.md ADR-006). The inferred
// types are the service layer's input contract: lib/domain imports these as TYPES only
// (erased at build), so the domain has no runtime dependency on Zod.

import { z } from 'zod';

const userId = z.string().trim().min(1, 'userId is required');

/** Body of POST /api/events and input to the create_event tool. */
export const CreateEventSchema = z.object({
  title: z.string().trim().min(1, 'title is required'),
  // Optional, no default: a default would fire inside .partial() (Zod 4 semantics) and
  // silently reset description on PATCH. createEvent normalizes a missing value to "".
  description: z.string().optional(),
  // ISO-8601; z.iso.datetime() requires a UTC ("Z") instant by default — exactly our contract.
  date: z.iso.datetime(),
  maxCapacity: z.number().int().positive('maxCapacity must be a positive integer'),
});

/** Body of PATCH /api/events/:id and input to update_event — any subset of the fields. */
export const UpdateEventSchema = CreateEventSchema.partial();

// Path-param schemas. In MCP these are the tool's flat input fields; in REST the value
// arrives from the URL (routing guarantees a non-empty segment) and the unregister handler
// re-validates `userId` through UserIdSchema so both consumers normalize input identically.
// Policy: `id` is an opaque identifier (NOT trimmed — matched exactly); `userId` is
// human-entered (trimmed). An unknown `id` surfaces as 404 from the service on both sides.

/** Path param `:id`. */
export const EventIdSchema = z.object({ id: z.string().min(1) });

/** Body of POST /api/events/:id/registrations and input to register_for_event. */
export const RegisterSchema = z.object({ userId });

/** Path param `:userId` for unregister. */
export const UserIdSchema = z.object({ userId });

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
