'use client';

import Link from 'next/link';
import useSWR from 'swr';
import type { EventView } from '@/lib/domain/types';
import { api } from '@/lib/client/api';
import { TalkCard } from './talk-card';
import { buttonStyles } from './ui';
import { isUpcomingThisWeek, talkStatus } from './talk-utils';

export function Dashboard(): React.ReactElement {
  const { data: events, error, isLoading, mutate } = useSWR<EventView[]>('events', () =>
    api.listEvents(),
  );

  if (error) {
    return (
      <Banner
        glyph="✗"
        tone="danger"
        message="Could not load talks — is the dev server running?"
        action={{ label: 'retry', onClick: () => void mutate() }}
      />
    );
  }
  if (isLoading || !events) return <Skeleton />;
  if (events.length === 0) return <EmptyState />;

  const reload = (): void => void mutate();

  const thisWeek = events.filter((e) => isUpcomingThisWeek(e)).sort(byDateAsc);
  const thisWeekIds = new Set(thisWeek.map((e) => e.id));
  const rest = events.filter((e) => !thisWeekIds.has(e.id)).sort(byUpcomingThenEnded);

  return (
    <div className="space-y-12">
      {thisWeek.length > 0 && (
        <Section name="this_week" count={thisWeek.length} label={`This week — ${thisWeek.length} talks`}>
          {thisWeek.map((e, i) => (
            <TalkCard key={e.id} event={e} index={i} onChanged={reload} />
          ))}
        </Section>
      )}
      {rest.length > 0 && (
        <Section name="all_talks" count={rest.length} label={`All talks — ${rest.length}`}>
          {rest.map((e, i) => (
            <TalkCard key={e.id} event={e} index={i} onChanged={reload} />
          ))}
        </Section>
      )}
    </div>
  );
}

// Time logic stays in the helpers (talk-utils) so the render path itself is pure.
function byDateAsc(a: EventView, b: EventView): number {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function byUpcomingThenEnded(a: EventView, b: EventView): number {
  const aEnded = talkStatus(a) === 'ENDED';
  const bEnded = talkStatus(b) === 'ENDED';
  if (aEnded !== bEnded) return aEnded ? 1 : -1; // ended sinks to the bottom
  const at = new Date(a.date).getTime();
  const bt = new Date(b.date).getTime();
  return aEnded ? bt - at : at - bt; // upcoming ascending, ended most-recent first
}

function Section({
  name,
  count,
  label,
  children,
}: {
  name: string;
  count: number;
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section>
      <h2 className="mb-4 flex items-baseline gap-2 font-mono text-sm" aria-label={label}>
        <span className="text-accent">{name}</span>
        <span className="text-faint" aria-hidden>
          ()
        </span>
        <span className="text-faint" aria-hidden>
          — {count}
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Skeleton(): React.ReactElement {
  return (
    <div>
      <div className="mb-4 h-4 w-32 rounded bg-panel" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-lg border border-line bg-panel" />
        ))}
      </div>
    </div>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div className="rounded-lg border border-dashed border-line bg-panel/50 p-12 text-center">
      <p className="font-mono text-sm text-muted">no talks scheduled yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-faint">
        Schedule the first lunch-and-learn and people can start saving seats.
      </p>
      <Link href="/events/new" className={`mt-5 ${buttonStyles('accent', 'md')}`}>
        <span aria-hidden>▸</span> new talk
      </Link>
    </div>
  );
}

export function Banner({
  glyph,
  tone,
  message,
  action,
}: {
  glyph: string;
  tone: 'danger' | 'muted';
  message: string;
  action?: { label: string; onClick: () => void };
}): React.ReactElement {
  const toneCls = tone === 'danger' ? 'border-danger/40 text-danger' : 'border-line text-muted';
  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-4 rounded-lg border bg-panel p-4 font-mono text-sm ${toneCls}`}
    >
      <span>
        <span className="mr-2 opacity-70" aria-hidden>
          {glyph}
        </span>
        {message}
      </span>
      {action && (
        <button onClick={action.onClick} className={buttonStyles('ghost', 'sm')}>
          {action.label}
        </button>
      )}
    </div>
  );
}
