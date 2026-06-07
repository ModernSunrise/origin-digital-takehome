# Assumptions

This document records the explicit assumptions made while designing the Event
Management API. Each assumption fills a gap left unspecified by the exercise
brief. They are stated up front so a reviewer can challenge any one of them
directly — and so the design's behavior is predictable rather than accidental.

Each entry follows the same shape:

- **Statement** — what we assume to be true.
- **Rationale** — why this is the reasonable reading of the brief.
- **Impact if violated** — what breaks, or what we would change, if the
  assumption turns out to be wrong.

For the precise contract these assumptions feed into, see the canonical
[domain model](../.claude/core-context/domain-model.md). For the decisions that
formalize the more consequential of these assumptions, see the
[ADRs](./decisions.md). For the requirements they support, see
[requirements](./requirements.md).

---

## A1 — A user is an identifier string, not an authenticated principal

**Statement.** A "user" is represented solely by a `userId` string (an email or
name) supplied in the request body. There is no user record, no authentication,
and no authorization. The server trusts the caller-supplied identifier as-is.

**Rationale.** Authentication is explicitly out of scope (see
[constraints](./constraints.md)). The business rules only need a stable token to
enforce per-user uniqueness on a registration; identity verification is
orthogonal to that logic. Modeling a full user aggregate would add surface area
without exercising the registration rules the brief actually asks for.

**Impact if violated.** If real identity were required, `userId` becomes an
authenticated subject (e.g., an Entra ID `oid` claim) resolved from a token
rather than the body. The domain stays untouched — uniqueness is still
`(eventId, userId)` — but an auth/identity seam is introduced ahead of the
service layer. That seam is described as the future productionization step in
[ADR-002](./decisions.md).

---

## A2 — Event date is a single start datetime, stored as UTC

**Statement.** An event has one `date` field: an ISO-8601 datetime representing
the event's start instant, normalized to and stored as UTC. There is no end
time, no duration, and no time zone per event.

**Rationale.** The brief specifies a single `date`. UTC is the only
unambiguous storage format for an instant; display-time-zone conversion is a
frontend concern. A single start instant is all R1 (no registration for a past
event) requires.

**Impact if violated.** Adding an end time or duration would extend the `Event`
type and could introduce overlap or window rules, but would not change the
registration model. Per-event time zones would require storing an offset
alongside the instant; the past-event comparison (A3) would still operate on the
absolute instant, so the rule logic is unaffected.

---

## A3 — "Past event" is decided against server `now` at registration time

**Statement.** An event is "past" when its `date` is strictly before the
server's current time (`Date.now()`, UTC) at the moment a registration is
attempted. The check is evaluated per registration request, not cached on the
event.

**Rationale.** R1 forbids registering for a past event. Because both the stored
`date` (A2) and the server clock are UTC instants, the comparison is a direct
instant comparison with no time-zone ambiguity. Evaluating at request time
(rather than at event creation) means an event correctly becomes closed to
registration the moment its start passes, with no background job required.

**Impact if violated.** If a grace period were desired (e.g., allow registration
up to N minutes after start), only the comparison threshold in
`RegistrationService.register` changes; the error
(`PastEventError`) and its mapping are unchanged. If a per-event time zone were
introduced (A2), the instant comparison still holds. Clock skew across instances
is a non-issue under the single-instance constraint (see
[constraints](./constraints.md)).

---

## A4 — Unregistering frees a capacity slot immediately

**Statement.** When a user unregisters, their registration is removed
immediately and the freed slot becomes available to the next registrant in the
same request cycle. There is no waitlist, no hold, and no soft-state on the
released slot.

**Rationale.** `availableCapacity` is **derived** from the live set of
registrations (it is not stored — see [domain model](../.claude/core-context/domain-model.md)),
so removing a registration mechanically increases availability. A waitlist is
not in the brief and would add a second business workflow without testing the
core capacity rule (R2) any harder.

**Impact if violated.** A waitlist would add a `RegistrationStatus`
(`CONFIRMED` / `WAITLISTED`) and promotion logic on unregister. That is an
additive change to `RegistrationService`; the capacity-counting rule still keys
off the count of `CONFIRMED` registrations. This assumption is what makes the
"unregister frees a slot" test meaningful (fill to capacity, unregister one,
register succeeds).

---

## A5 — Reducing `maxCapacity` below the current registration count is rejected

**Statement.** Updating an event's `maxCapacity` to a value lower than its
current registration count is rejected with `CapacityBelowCurrentError`
(mapped to 409 Conflict). Existing registrations are never silently dropped or
invalidated.

**Rationale.** Registrations are commitments already made; honoring them is the
safe default. Auto-evicting registrants to fit a smaller capacity would be a
surprising, destructive side effect of an update call. Rejecting keeps the
invariant `registrationCount <= maxCapacity` true at all times and gives the
caller a clear, actionable error.

**Impact if violated.** If a product chose to allow over-subscription on
shrink (capacity below count permitted, new registrations still blocked until
attrition), the update path would drop the check and the invariant would relax
to "`registrationCount` may temporarily exceed `maxCapacity`." That would weaken
R2's guarantee and is deliberately not chosen here. The error taxonomy and its
status mapping are owned by [ADR-005](./decisions.md).

---

## A6 — Hard-delete of events is excluded from the MVP

**Statement.** There is no endpoint to delete an event. Events can be created,
read, and updated, but not removed. Registrations can be removed (unregister);
events cannot.

**Rationale.** Deleting an event with live registrations would orphan those
registrations and silently break commitments. The real-world analog is
soft-cancel / archival, not destruction. Hard-delete is not required by the
brief, and excluding it keeps the data model free of cascade and tombstone
concerns the exercise does not ask us to demonstrate. Full reasoning, including
the soft-cancel alternative, is recorded in
[ADR-004](./decisions.md).

**Impact if violated.** If delete were required, the right shape is a soft
cancel (an event status of `CANCELLED`) rather than a hard delete — preserving
the registration history and the audit trail. A hard delete would force a
decision about cascading or blocking on existing registrations; we avoid that
decision entirely by excluding the operation. See
[ADR-004](./decisions.md) for the chosen path.

---

## Notes

- These assumptions are design choices made to resolve ambiguity, not
  requirements. The numbered requirements live in [requirements](./requirements.md).
- Where an assumption hardens into a tradeoff with alternatives worth recording
  (no-delete, error mapping), it graduates into an ADR in
  [decisions.md](./decisions.md), which this document references rather than restates.
