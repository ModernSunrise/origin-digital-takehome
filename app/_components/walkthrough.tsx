'use client';

import Link from 'next/link';
import useSWR from 'swr';
import type { EventView } from '@/lib/domain/types';
import { api } from '@/lib/client/api';
import { ORDERED_SLUGS, getTalkContent } from '@/app/_content/talks';
import { talkFileName } from './talk-utils';

interface Neighbor {
  readonly id: string;
  readonly title: string;
}
interface Neighbors {
  readonly prev: Neighbor | null;
  readonly next: Neighbor | null;
}

export function Walkthrough({ event }: { event: EventView }): React.ReactElement | null {
  const slug = talkFileName(event.title);
  const content = getTalkContent(slug);

  // Subscribe to the SAME list cache the dashboard fills — resolves neighbor chapter ids with
  // no extra fetch on a warm cache, one fetch on a cold deep-link. Derived during render.
  const { data: events } = useSWR<EventView[]>('events', () => api.listEvents());

  if (!content) return null; // user-created talks: no walkthrough, by design

  const { prev, next } = resolveNeighbors(slug, events);

  return (
    <section className="fade-up mt-14 border-t border-line pt-10">
      {content.render()}
      <ChapterNav prev={prev} next={next} />
    </section>
  );
}

function resolveNeighbors(slug: string, events: readonly EventView[] | undefined): Neighbors {
  if (!events) return { prev: null, next: null };
  const idx = ORDERED_SLUGS.indexOf(slug);
  if (idx < 0) return { prev: null, next: null };
  const bySlug = new Map(events.map((e) => [talkFileName(e.title), e] as const));
  return {
    prev: toNeighbor(ORDERED_SLUGS[idx - 1], bySlug),
    next: toNeighbor(ORDERED_SLUGS[idx + 1], bySlug),
  };
}

function toNeighbor(
  slug: string | undefined,
  bySlug: ReadonlyMap<string, EventView>,
): Neighbor | null {
  if (!slug) return null;
  const ev = bySlug.get(slug);
  return ev ? { id: ev.id, title: ev.title } : null;
}

function ChapterNav({ prev, next }: Neighbors): React.ReactElement | null {
  if (!prev && !next) return null;
  return (
    <nav className="mt-10 flex items-stretch justify-between gap-4 border-t border-line pt-5">
      {prev ? (
        <Link
          href={`/events/${prev.id}`}
          className="flex min-w-0 max-w-[48%] items-center gap-2.5 rounded-md border border-line bg-panel px-3.5 py-2.5 font-mono text-[13px] text-ink transition-colors hover:border-edge hover:bg-raised"
        >
          <span aria-hidden className="shrink-0 text-accent">
            ←
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] text-faint">prev</span>
            <span className="block truncate">{prev.title}</span>
          </span>
        </Link>
      ) : (
        <span aria-hidden />
      )}
      {next ? (
        <Link
          href={`/events/${next.id}`}
          className="flex min-w-0 max-w-[48%] items-center gap-2.5 rounded-md border border-accent/30 bg-accent/10 px-3.5 py-2.5 font-mono text-[13px] text-accent transition-colors hover:border-accent/50 hover:bg-accent/20"
        >
          <span className="min-w-0 text-right">
            <span className="block text-[10px] text-faint">next</span>
            <span className="block truncate">{next.title}</span>
          </span>
          <span aria-hidden className="shrink-0">
            →
          </span>
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}
