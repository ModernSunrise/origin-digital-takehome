// RegistrationService — pure, transport-agnostic registration operations. The home of the
// three business rules. Named async functions, not a class. Throws typed domain errors.
// Contract + canonical evaluation order: .claude/core-context/domain-model.md.

import type { Registration } from './types';
import {
  CapacityExceededError,
  DuplicateRegistrationError,
  EventNotFoundError,
  PastEventError,
  RegistrationNotFoundError,
} from './errors';
import {
  findEvent,
  findRegistration,
  findRegistrationsByEvent,
  removeRegistration,
  saveRegistration,
} from './store';
import { now } from './clock';
import { newId } from './ids';

export async function register(eventId: string, userId: string): Promise<Registration> {
  // Evaluation order is canonical: existence -> past (R1) -> duplicate (R3) -> capacity (R2).
  const event = await findEvent(eventId);
  if (!event) throw new EventNotFoundError(eventId);

  if (new Date(event.date).getTime() < now().getTime()) {
    throw new PastEventError(eventId); // R1: an event starting exactly at now is NOT past
  }

  if (await findRegistration(eventId, userId)) {
    throw new DuplicateRegistrationError(eventId, userId); // R3
  }

  const registrationCount = (await findRegistrationsByEvent(eventId)).length;
  if (registrationCount >= event.maxCapacity) {
    throw new CapacityExceededError(eventId); // R2
  }

  const registration: Registration = {
    id: newId(),
    eventId,
    userId,
    registeredAt: now().toISOString(),
  };
  await saveRegistration(registration);
  return registration;
}

export async function unregister(eventId: string, userId: string): Promise<void> {
  const event = await findEvent(eventId);
  if (!event) throw new EventNotFoundError(eventId);

  const registration = await findRegistration(eventId, userId);
  if (!registration) throw new RegistrationNotFoundError(eventId, userId);

  await removeRegistration(registration.id); // frees a capacity slot immediately
}

export async function listRegistrationsForEvent(eventId: string): Promise<readonly Registration[]> {
  const event = await findEvent(eventId);
  if (!event) throw new EventNotFoundError(eventId);
  return findRegistrationsByEvent(eventId);
}
