// The single persistence seam. In-memory today (module-scope Maps); swap for Cosmos DB
// without changing any service SIGNATURE or any caller (see docs/decisions.md ADR-002).
// Accessors are async on purpose: that swap becomes an implementation change here, not an
// async refactor that ripples out to every service, route handler, and MCP tool.
//
// State survives only within one process — single-instance by design. Only this module
// touches the Maps; services go through these functions, never the Maps directly.

import type { Event, Registration } from './types';

const events = new Map<string, Event>(); // key: event.id
const registrations = new Map<string, Registration>(); // key: registration.id

export async function findEvent(id: string): Promise<Event | undefined> {
  return events.get(id);
}

export async function findAllEvents(): Promise<readonly Event[]> {
  return [...events.values()];
}

export async function saveEvent(event: Event): Promise<void> {
  events.set(event.id, event);
}

export async function findRegistration(
  eventId: string,
  userId: string,
): Promise<Registration | undefined> {
  return [...registrations.values()].find((r) => r.eventId === eventId && r.userId === userId);
}

export async function findRegistrationsByEvent(eventId: string): Promise<readonly Registration[]> {
  return [...registrations.values()].filter((r) => r.eventId === eventId);
}

export async function saveRegistration(registration: Registration): Promise<void> {
  registrations.set(registration.id, registration);
}

export async function removeRegistration(id: string): Promise<void> {
  registrations.delete(id);
}

/** Test-only isolation seam. Clears all state. Call in beforeEach. Never call in production. */
export function resetStore(): void {
  events.clear();
  registrations.clear();
}
