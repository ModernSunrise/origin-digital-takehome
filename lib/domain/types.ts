// Canonical entity types. MUST match .claude/core-context/domain-model.md.
// Stored fields are authoritative; derived fields are computed on read, never persisted.

/** A stored event. `registrationCount`/`availableCapacity` are DERIVED (see EventView). */
export interface Event {
  readonly id: string; // uuid v4
  readonly title: string; // non-empty (trimmed length > 0)
  readonly description: string; // may be "" but never undefined once stored
  readonly date: string; // ISO-8601 UTC datetime, the event start
  readonly maxCapacity: number; // positive integer (>= 1)
  readonly createdAt: string; // ISO-8601 UTC datetime
  readonly updatedAt: string; // ISO-8601 UTC datetime
}

/** A stored registration. `(eventId, userId)` is unique. */
export interface Registration {
  readonly id: string; // uuid v4
  readonly eventId: string; // references Event.id
  readonly userId: string; // the email/name identifier (auth out of scope)
  readonly registeredAt: string; // ISO-8601 UTC datetime
}

/** Read model returned to consumers: a stored Event plus its derived counts. */
export interface EventView extends Event {
  readonly registrationCount: number; // count of registrations for this event
  readonly availableCapacity: number; // max(0, maxCapacity - registrationCount)
}
