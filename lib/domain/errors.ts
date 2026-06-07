// The domain error taxonomy. Each error carries a stable `code` that the boundary
// adapters (HTTP route handlers, MCP tools) switch on to choose a status / tool result.
// The canonical code -> HTTP -> MCP mapping lives in
// .claude/core-context/domain-model.md. This layer never knows about HTTP or MCP.

export type DomainErrorCode =
  | 'VALIDATION'
  | 'EVENT_NOT_FOUND'
  | 'REGISTRATION_NOT_FOUND'
  | 'DUPLICATE_REGISTRATION'
  | 'CAPACITY_EXCEEDED'
  | 'CAPACITY_BELOW_CURRENT'
  | 'PAST_EVENT';

/** Base class for every business-rule failure. Never thrown directly. */
export abstract class DomainError extends Error {
  readonly code: DomainErrorCode;

  protected constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = new.target.name; // concrete subclass name, e.g. "PastEventError"
  }
}

/** Input was malformed or semantically invalid (Zod failure at the boundary). */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super('VALIDATION', message);
  }
}

export class EventNotFoundError extends DomainError {
  constructor(eventId: string) {
    super('EVENT_NOT_FOUND', `Event not found: ${eventId}`);
  }
}

export class RegistrationNotFoundError extends DomainError {
  constructor(eventId: string, userId: string) {
    super('REGISTRATION_NOT_FOUND', `No registration for user "${userId}" on event ${eventId}`);
  }
}

/** R3 — the same user is already registered for this event. */
export class DuplicateRegistrationError extends DomainError {
  constructor(eventId: string, userId: string) {
    super('DUPLICATE_REGISTRATION', `User "${userId}" is already registered for event ${eventId}`);
  }
}

/** R2 — the event is at capacity. */
export class CapacityExceededError extends DomainError {
  constructor(eventId: string) {
    super('CAPACITY_EXCEEDED', `Event ${eventId} is at capacity`);
  }
}

/** Update would set maxCapacity below the current registration count. */
export class CapacityBelowCurrentError extends DomainError {
  constructor(eventId: string, requested: number, current: number) {
    super(
      'CAPACITY_BELOW_CURRENT',
      `Cannot set capacity of event ${eventId} to ${requested}; ${current} attendees are already registered`,
    );
  }
}

/** R1 — cannot register for an event whose start is in the past. */
export class PastEventError extends DomainError {
  constructor(eventId: string) {
    super('PAST_EVENT', `Event ${eventId} has already started; registration is closed`);
  }
}
