'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import type { EventView } from '@/lib/domain/types';
import { api } from '@/lib/client/api';
import { ORDERED_SLUGS, getTalkContent } from '@/app/_content/talks';
import { talkFileName } from './talk-utils';

interface Neighbor {
  readonly id: string;
  readonly title: string;
}

export function Walkthrough({ event }: { event: EventView }): React.ReactElement | null {
  const slug = talkFileName(event.title);
  const content = getTalkContent(slug);
  const { data: events } = useSWR<EventView[]>('events', () => api.listEvents());

  if (!content) return null;

  const { prev, next } = resolveNeighbors(slug, events);

  return (
    <section className="mt-9">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="num flex h-5 w-5 items-center justify-center rounded-[6px] border border-line text-[11px] font-semibold text-faint">
          3
        </span>
        <span className="t-label text-faint">Walkthrough</span>
      </div>

      <div className="dh-card overflow-hidden">
        <div className="organic-gradient border-b border-line" style={{ padding: '26px 32px 22px' }}>
          <div className="inline-flex items-center gap-2 text-accent">
            <BookOpen size={14} strokeWidth={2} />
            <span className="t-label">Chapter {String(content.order).padStart(2, '0')}</span>
          </div>
          <h2 className="t-read-h mt-3 text-ink">{content.heading}</h2>
        </div>

        <div style={{ padding: '24px 32px 28px' }}>
          {content.render()}
          <nav className="mt-7 flex justify-between gap-3.5 border-t border-line pt-5">
            <ChapterLink neighbor={prev} dir="prev" />
            <ChapterLink neighbor={next} dir="next" />
          </nav>
        </div>
      </div>
    </section>
  );
}

function resolveNeighbors(
  slug: string,
  events: readonly EventView[] | undefined,
): { prev: Neighbor | null; next: Neighbor | null } {
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

function ChapterLink({
  neighbor,
  dir,
}: {
  neighbor: Neighbor | null;
  dir: 'prev' | 'next';
}): React.ReactElement {
  if (!neighbor) return <span aria-hidden />;
  const next = dir === 'next';
  return (
    <Link
      href={`/events/${neighbor.id}`}
      className="dh-card flex max-w-[49%] items-center gap-3 px-4 py-3"
      style={{
        boxShadow: 'none',
        textAlign: next ? 'right' : 'left',
        border: next ? '1px solid var(--accent-border)' : '1px solid var(--border)',
        background: next ? 'var(--accent-subtle)' : 'var(--card)',
      }}
    >
      {!next ? <ArrowLeft size={18} className="flex-none text-accent" /> : null}
      <span className="min-w-0">
        <span className="t-label block text-faint">{next ? 'Next' : 'Previous'}</span>
        <span
          className="block truncate text-sm font-medium"
          style={{ color: next ? 'var(--accent-ink)' : 'var(--foreground)' }}
        >
          {neighbor.title}
        </span>
      </span>
      {next ? <ArrowRight size={18} className="flex-none text-accent" /> : null}
    </Link>
  );
}
