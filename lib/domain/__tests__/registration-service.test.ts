import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEvent, getEvent } from '../event-service';
import { listRegistrationsForEvent, register, unregister } from '../registration-service';
import { resetStore } from '../store';
import {
  CapacityExceededError,
  DuplicateRegistrationError,
  EventNotFoundError,
  PastEventError,
  RegistrationNotFoundError,
} from '../errors';
import type { CreateEventInput } from '../../validation/schemas';

const NOW = new Date('2026-06-07T12:00:00.000Z');
const FUTURE = '2026-12-01T18:00:00.000Z';
const PAST = '2026-01-01T18:00:00.000Z';

function makeEvent(overrides: Partial<CreateEventInput> = {}) {
  return createEvent({
    title: overrides.title ?? 'Talk',
    description: overrides.description ?? '',
    date: overrides.date ?? FUTURE,
    maxCapacity: overrides.maxCapacity ?? 2,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('register — happy path', () => {
  it('registers a user and records the registration', async () => {
    const event = await makeEvent({ maxCapacity: 5 });
    const reg = await register(event.id, 'a@example.com');
    expect(reg.eventId).toBe(event.id);
    expect(reg.userId).toBe('a@example.com');
    expect(reg.registeredAt).toBe(NOW.toISOString());
    expect(await listRegistrationsForEvent(event.id)).toHaveLength(1);
  });
});

describe('register — R1 past event', () => {
  it('rejects registration for an event that has already started', async () => {
    const event = await makeEvent({ date: PAST });
    await expect(register(event.id, 'a@example.com')).rejects.toBeInstanceOf(PastEventError);
  });

  it('allows registration for an event starting exactly at now (boundary)', async () => {
    const event = await makeEvent({ date: NOW.toISOString() });
    const reg = await register(event.id, 'a@example.com');
    expect(reg.userId).toBe('a@example.com');
  });

  it('past wins over duplicate and capacity (canonical evaluation order)', async () => {
    // Seed while the event is in the future, then advance the clock past its start so the
    // SAME user, on a now-past AND now-full event, hits the past check first.
    const event = await makeEvent({ date: FUTURE, maxCapacity: 1 });
    await register(event.id, 'a@example.com');
    vi.setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    await expect(register(event.id, 'a@example.com')).rejects.toBeInstanceOf(PastEventError);
  });
});

describe('register — R2 capacity', () => {
  it('rejects registration once the event is full', async () => {
    const event = await makeEvent({ maxCapacity: 2 });
    await register(event.id, 'a@example.com');
    await register(event.id, 'b@example.com');
    await expect(register(event.id, 'c@example.com')).rejects.toBeInstanceOf(CapacityExceededError);
  });

  it('accepts the last seat exactly at capacity', async () => {
    const event = await makeEvent({ maxCapacity: 1 });
    const reg = await register(event.id, 'a@example.com');
    expect(reg.userId).toBe('a@example.com');
    await expect(register(event.id, 'b@example.com')).rejects.toBeInstanceOf(CapacityExceededError);
  });
});

describe('register — R3 duplicate', () => {
  it('rejects the same user registering twice for the same event', async () => {
    const event = await makeEvent({ maxCapacity: 5 });
    await register(event.id, 'a@example.com');
    await expect(register(event.id, 'a@example.com')).rejects.toBeInstanceOf(
      DuplicateRegistrationError,
    );
  });

  it('checks duplicate before capacity (canonical evaluation order)', async () => {
    // Event is full AND the re-registering user is already in it: duplicate wins, not capacity.
    const event = await makeEvent({ maxCapacity: 1 });
    await register(event.id, 'a@example.com'); // now full
    await expect(register(event.id, 'a@example.com')).rejects.toBeInstanceOf(
      DuplicateRegistrationError,
    );
  });
});

describe('unregister', () => {
  it('frees a slot immediately so a new user can register', async () => {
    const event = await makeEvent({ maxCapacity: 1 });
    await register(event.id, 'a@example.com'); // full
    await expect(register(event.id, 'b@example.com')).rejects.toBeInstanceOf(CapacityExceededError);
    expect(await unregister(event.id, 'a@example.com')).toBeUndefined(); // unregister returns void
    const reg = await register(event.id, 'b@example.com');
    expect(reg.userId).toBe('b@example.com');
  });

  it('throws RegistrationNotFoundError when the user is not registered', async () => {
    const event = await makeEvent();
    await expect(unregister(event.id, 'ghost@example.com')).rejects.toBeInstanceOf(
      RegistrationNotFoundError,
    );
  });

  it('throws EventNotFoundError for an unknown event', async () => {
    await expect(unregister('nope', 'a@example.com')).rejects.toBeInstanceOf(EventNotFoundError);
  });
});

describe('unknown event', () => {
  it('register throws EventNotFoundError', async () => {
    await expect(register('nope', 'a@example.com')).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('listRegistrationsForEvent throws EventNotFoundError', async () => {
    await expect(listRegistrationsForEvent('nope')).rejects.toBeInstanceOf(EventNotFoundError);
  });
});

describe('derived counts', () => {
  it('track registrations in the live range and drop on unregister', async () => {
    const event = await makeEvent({ maxCapacity: 5 });
    await register(event.id, 'a@example.com');
    await register(event.id, 'b@example.com');

    let view = await getEvent(event.id);
    expect(view.registrationCount).toBe(2);
    expect(view.availableCapacity).toBe(3);

    await unregister(event.id, 'a@example.com');

    view = await getEvent(event.id);
    expect(view.registrationCount).toBe(1);
    expect(view.availableCapacity).toBe(4);
  });
});
