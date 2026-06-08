import type { EventView } from '@/lib/domain/types';
import { ApiError } from '@/lib/client/api';

export type TalkStatus = 'OPEN' | 'FULL' | 'PAST';

/** Product-facing status. PAST (already started) takes precedence over FULL. */
export function talkStatus(event: EventView, now: number = Date.now()): TalkStatus {
  if (new Date(event.date).getTime() < now) return 'PAST';
  if (event.availableCapacity <= 0) return 'FULL';
  return 'OPEN';
}

/** Upcoming and starting within the next 7 days. */
export function isUpcomingThisWeek(event: EventView, now: number = Date.now()): boolean {
  const start = new Date(event.date).getTime();
  return start >= now && start <= now + 7 * 24 * 60 * 60 * 1000;
}

const WHEN = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatWhen(iso: string): string {
  return WHEN.format(new Date(iso));
}

const RELATIVE = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

/** A short relative time, e.g. "in 2 days" / "3 hours ago". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  const days = Math.round(diffMs / 86_400_000);
  if (Math.abs(days) >= 1) return RELATIVE.format(days, 'day');
  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) >= 1) return RELATIVE.format(hours, 'hour');
  return RELATIVE.format(Math.round(diffMs / 60_000), 'minute');
}

/** Slug used to join a talk to its walkthrough chapter content (internal). */
export function talkFileName(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

/** Map an ApiError code to a human, product-voice message. */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'PAST_EVENT':
        return 'This talk has already started — registration is closed.';
      case 'CAPACITY_EXCEEDED':
        return 'This talk is sold out.';
      case 'DUPLICATE_REGISTRATION':
        return 'You already have a seat for this talk.';
      case 'CAPACITY_BELOW_CURRENT':
        return err.message;
      case 'EVENT_NOT_FOUND':
        return 'That talk no longer exists.';
      case 'REGISTRATION_NOT_FOUND':
        return 'You don’t have a seat for this talk.';
      case 'VALIDATION':
        return err.issues[0]?.message ?? 'Please check the form and try again.';
      default:
        return err.message || 'Something went wrong.';
    }
  }
  return 'Network error — is the server running?';
}
