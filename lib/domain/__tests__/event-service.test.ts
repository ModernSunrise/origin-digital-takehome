import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEvent, getEvent, listEvents, updateEvent } from '../event-service';
import { register } from '../registration-service';
import { resetStore } from '../store';
import { CapacityBelowCurrentError, EventNotFoundError } from '../errors';
import type { CreateEventInput } from '../../validation/schemas';

const NOW = new Date('2026-06-07T12:00:00.000Z');
const FUTURE = '2026-12-01T18:00:00.000Z';

function eventInput(overrides: Partial<CreateEventInput> = {}): CreateEventInput {
  return {
    title: overrides.title ?? 'Building MCP Servers',
    description: overrides.description ?? 'one rule-set, two consumers',
    date: overrides.date ?? FUTURE,
    maxCapacity: overrides.maxCapacity ?? 30,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createEvent', () => {
  it('returns an EventView with derived counts and UTC timestamps', async () => {
    const event = await createEvent(eventInput({ maxCapacity: 40 }));
    expect(event.id).toBeTruthy();
    expect(event.registrationCount).toBe(0);
    expect(event.availableCapacity).toBe(40);
    expect(event.createdAt).toBe(NOW.toISOString());
    expect(event.updatedAt).toBe(NOW.toISOString());
    expect(event.description).toBe('one rule-set, two consumers');
  });

  it('normalizes a missing description to an empty string', async () => {
    const event = await createEvent({ title: 'Bicep & IaC', date: FUTURE, maxCapacity: 10 });
    expect(event.description).toBe('');
  });
});

describe('getEvent', () => {
  it('returns the stored event', async () => {
    const created = await createEvent(eventInput());
    const fetched = await getEvent(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.title).toBe('Building MCP Servers');
  });

  it('throws EventNotFoundError for an unknown id', async () => {
    await expect(getEvent('does-not-exist')).rejects.toBeInstanceOf(EventNotFoundError);
  });
});

describe('listEvents', () => {
  it('returns every event with derived counts', async () => {
    await createEvent(eventInput({ title: 'A' }));
    await createEvent(eventInput({ title: 'B' }));
    const events = await listEvents();
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.registrationCount === 0)).toBe(true);
  });
});

describe('updateEvent', () => {
  it('applies a partial patch and bumps updatedAt without touching createdAt', async () => {
    const created = await createEvent(eventInput({ title: 'Old', maxCapacity: 30 }));
    vi.setSystemTime(new Date('2026-06-07T13:00:00.000Z'));
    const updated = await updateEvent(created.id, { title: 'New' });
    expect(updated.title).toBe('New');
    expect(updated.maxCapacity).toBe(30); // untouched field preserved
    expect(updated.updatedAt).toBe('2026-06-07T13:00:00.000Z');
    expect(updated.createdAt).toBe(NOW.toISOString());
  });

  it('leaves description untouched when the field is omitted from the patch', async () => {
    const created = await createEvent(eventInput({ description: 'keep me' }));
    const updated = await updateEvent(created.id, { title: 'Renamed' });
    expect(updated.description).toBe('keep me');
  });

  it('throws EventNotFoundError for an unknown id', async () => {
    await expect(updateEvent('nope', { title: 'x' })).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('rejects lowering maxCapacity below the current registration count', async () => {
    const created = await createEvent(eventInput({ maxCapacity: 3 }));
    await register(created.id, 'a@example.com');
    await register(created.id, 'b@example.com');
    await expect(updateEvent(created.id, { maxCapacity: 1 })).rejects.toBeInstanceOf(
      CapacityBelowCurrentError,
    );
  });

  it('allows lowering maxCapacity to exactly the current count', async () => {
    const created = await createEvent(eventInput({ maxCapacity: 3 }));
    await register(created.id, 'a@example.com');
    await register(created.id, 'b@example.com');
    const updated = await updateEvent(created.id, { maxCapacity: 2 });
    expect(updated.maxCapacity).toBe(2);
    expect(updated.availableCapacity).toBe(0);
  });
});
