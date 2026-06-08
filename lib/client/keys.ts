// SWR cache-key factories and revalidation helpers — the single source of truth for the
// keys the React components read and invalidate. The keys were previously written as raw
// literals at every call site and invalidated three different ways; centralizing them here
// keeps the read keys and the post-mutation revalidation in lockstep so they cannot drift.

import { mutate } from 'swr';

/** Key for the events list (dashboard, walkthrough neighbors). */
export const eventsKey = 'events';

/** Key for a single event's detail view. */
export function eventKey(id: string): readonly [string, string] {
  return ['event', id];
}

/** Key for an event's registration roster. */
export function regsKey(id: string): readonly [string, string] {
  return ['regs', id];
}

/** Revalidate the events list — used after a create, where there is no event id yet. */
export async function revalidateEvents(): Promise<void> {
  await mutate(eventsKey);
}

/** Revalidate every cache entry that depends on one event: the list, its detail, its roster. */
export async function revalidateEvent(id: string): Promise<void> {
  await Promise.all([mutate(eventsKey), mutate(eventKey(id)), mutate(regsKey(id))]);
}
