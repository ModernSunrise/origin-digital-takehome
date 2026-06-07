// EventService — pure, transport-agnostic event operations. Named async functions, not a
// class. No HTTP/Next/MCP imports; throws typed domain errors. Unit-test target.
// Contract: .claude/core-context/domain-model.md.

import type { Event, EventView } from './types';
// Type-only import: the input contract's single source is the shared Zod schema. Erased at
// build, so the domain keeps no runtime dependency on validation or Zod.
import type { CreateEventInput, UpdateEventInput } from '../validation/schemas';
import { CapacityBelowCurrentError, EventNotFoundError } from './errors';
import { findAllEvents, findEvent, findRegistrationsByEvent, saveEvent } from './store';
import { now } from './clock';
import { newId } from './ids';

/** Attach derived counts to a stored event. registrationCount/availableCapacity are never stored. */
async function toView(event: Event): Promise<EventView> {
  const registrationCount = (await findRegistrationsByEvent(event.id)).length;
  return {
    ...event,
    registrationCount,
    availableCapacity: Math.max(0, event.maxCapacity - registrationCount),
  };
}

export async function createEvent(input: CreateEventInput): Promise<EventView> {
  const timestamp = now().toISOString();
  const event: Event = {
    id: newId(),
    title: input.title,
    description: input.description ?? '',
    date: input.date,
    maxCapacity: input.maxCapacity,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await saveEvent(event);
  return toView(event);
}

export async function getEvent(id: string): Promise<EventView> {
  const event = await findEvent(id);
  if (!event) throw new EventNotFoundError(id);
  return toView(event);
}

export async function listEvents(): Promise<readonly EventView[]> {
  const events = await findAllEvents();
  return Promise.all(events.map(toView));
}

export async function updateEvent(id: string, patch: UpdateEventInput): Promise<EventView> {
  const event = await findEvent(id);
  if (!event) throw new EventNotFoundError(id);

  if (patch.maxCapacity !== undefined) {
    const current = (await findRegistrationsByEvent(id)).length;
    if (patch.maxCapacity < current) {
      throw new CapacityBelowCurrentError(id, patch.maxCapacity, current);
    }
  }

  // Conditional spread (not `?? event.x`) so an omitted field is left untouched and we
  // never assign `undefined` under exactOptionalPropertyTypes.
  const updated: Event = {
    ...event,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.maxCapacity !== undefined ? { maxCapacity: patch.maxCapacity } : {}),
    updatedAt: now().toISOString(),
  };
  await saveEvent(updated);
  return toView(updated);
}
