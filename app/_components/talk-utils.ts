import type { EventView } from '@/lib/domain/types';
import { ApiError } from '@/lib/client/api';

export type TalkStatus = 'OPEN' | 'SOLD_OUT' | 'ENDED';

/** Derive the product-facing status. ENDED (past) takes precedence over SOLD_OUT. */
export function talkStatus(event: EventView, now: number = Date.now()): TalkStatus {
  if (new Date(event.date).getTime() < now) return 'ENDED';
  if (event.availableCapacity <= 0) return 'SOLD_OUT';
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

/** Turn a title into an IDE-style filename, e.g. "Building MCP Servers" -> "building-mcp-servers.talk". */
export function talkFileName(title: string): string {
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled';
  return `${slug}.talk`;
}

/** Map an ApiError code to a human, product-voice message (the business rules as copy). */
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
