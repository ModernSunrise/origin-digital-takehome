import { describe, expect, it } from 'vitest';

import { CreateEventSchema, RegisterSchema, UpdateEventSchema } from './schemas';

const valid = { title: 'Talk', date: '2026-12-01T18:00:00.000Z', maxCapacity: 10 };

describe('CreateEventSchema', () => {
  it('accepts a valid payload (description optional)', () => {
    expect(CreateEventSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an explicit empty-string description', () => {
    expect(CreateEventSchema.safeParse({ ...valid, description: '' }).success).toBe(true);
  });

  it('rejects an empty or whitespace-only title', () => {
    expect(CreateEventSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false);
  });

  it('rejects a non-positive or non-integer capacity', () => {
    expect(CreateEventSchema.safeParse({ ...valid, maxCapacity: 0 }).success).toBe(false);
    expect(CreateEventSchema.safeParse({ ...valid, maxCapacity: 2.5 }).success).toBe(false);
  });

  it('requires an ISO-8601 UTC datetime (rejects date-only and offset times)', () => {
    expect(CreateEventSchema.safeParse({ ...valid, date: '2026-12-01' }).success).toBe(false);
    expect(CreateEventSchema.safeParse({ ...valid, date: '2026-12-01T18:00:00+02:00' }).success).toBe(
      false,
    );
  });
});

describe('UpdateEventSchema', () => {
  it('accepts an empty patch and a partial patch', () => {
    expect(UpdateEventSchema.safeParse({}).success).toBe(true);
    expect(UpdateEventSchema.safeParse({ title: 'New' }).success).toBe(true);
  });

  it('does not inject a default description on a partial update', () => {
    const parsed = UpdateEventSchema.parse({ title: 'New' });
    expect('description' in parsed).toBe(false);
  });
});

describe('RegisterSchema', () => {
  it('requires a non-empty userId', () => {
    expect(RegisterSchema.safeParse({ userId: '' }).success).toBe(false);
    expect(RegisterSchema.safeParse({ userId: 'a@example.com' }).success).toBe(true);
  });
});
