'use client';

import useSWR from 'swr';
import { AlertCircle, Inbox, Plus } from 'lucide-react';
import type { EventView } from '@/lib/domain/types';
import { api } from '@/lib/client/api';
import { eventsKey } from '@/lib/client/keys';
import { TalkCard } from './talk-card';
import { useTalkForm } from './talk-form-modal';
import { buttonStyles } from './ui';
import { isUpcomingThisWeek, talkStatus } from './talk-utils';

export function Dashboard(): React.ReactElement {
  const { data: events, error, isLoading } = useSWR<EventView[]>(eventsKey, () => api.listEvents());
  const { openCreate } = useTalkForm();

  if (error) return <Banner message="Could not load talks — is the dev server running?" />;
  if (isLoading || !events) return <Skeleton />;
  if (events.length === 0) return <EmptyState onCreate={openCreate} />;

  const week = events.filter((e) => isUpcomingThisWeek(e)).sort(byDateAsc);
  const weekIds = new Set(week.map((e) => e.id));
  const rest = events.filter((e) => !weekIds.has(e.id)).sort(byUpcomingThenPast);

  return (
    <div>
      <Hero total={events.length} week={week.length} />
      {week.length > 0 && (
        <Section title="This week" count={week.length}>
          {week.map((e) => (
            <TalkCard key={e.id} event={e} />
          ))}
        </Section>
      )}
      {rest.length > 0 && (
        <Section title="All talks" count={rest.length}>
          {rest.map((e) => (
            <TalkCard key={e.id} event={e} />
          ))}
        </Section>
      )}
    </div>
  );
}

function byDateAsc(a: EventView, b: EventView): number {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function byUpcomingThenPast(a: EventView, b: EventView): number {
  const ap = talkStatus(a) === 'PAST';
  const bp = talkStatus(b) === 'PAST';
  if (ap !== bp) return ap ? 1 : -1;
  const at = new Date(a.date).getTime();
  const bt = new Date(b.date).getTime();
  return ap ? bt - at : at - bt;
}

const GRID = { gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' } as const;

function Hero({ total, week }: { total: number; week: number }): React.ReactElement {
  return (
    <div
      className="organic-gradient mt-2 overflow-hidden border border-line"
      style={{ borderRadius: 'var(--radius-xl)', padding: '38px 40px' }}
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="t-h1 text-ink">Talks</h1>
          <p className="t-body-lg mt-2 text-muted">Tech talks worth a lunch break.</p>
        </div>
        <div className="num flex gap-7">
          <Stat n={total} label="scheduled" />
          <Stat n={week} label="this week" accent />
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label, accent = false }: { n: number; label: string; accent?: boolean }): React.ReactElement {
  return (
    <div className="text-right">
      <div
        className="text-[30px] font-bold tracking-[-0.02em]"
        style={{ color: accent ? 'var(--accent-ink)' : 'var(--foreground)' }}
      >
        {n}
      </div>
      <div className="t-label mt-0.5 text-faint">{label}</div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline gap-2.5">
        <h2 className="t-h2 text-ink">{title}</h2>
        <span className="num text-[length:var(--fs-body)] text-faint">{count}</span>
      </div>
      <div className="grid gap-[18px]" style={GRID}>
        {children}
      </div>
    </section>
  );
}

function Skeleton(): React.ReactElement {
  return (
    <div className="mt-10">
      <div className="mb-4 h-[26px] w-[150px] rounded-md bg-panel" />
      <div className="grid gap-[18px]" style={GRID}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dh-card" style={{ height: 232, opacity: 0.7 }}>
            <div className="dh-card__body flex flex-col gap-3.5">
              <div className="h-3.5 w-[55%] rounded bg-raised" />
              <div className="h-5 w-[80%] rounded bg-raised" />
              <div className="h-8 w-full rounded bg-raised" />
              <div className="mt-auto h-1.5 w-full rounded-full bg-raised" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }): React.ReactElement {
  return (
    <div
      className="mt-10 rounded-[var(--radius-lg)] border border-dashed border-edge bg-subtle text-center"
      style={{ padding: '56px 24px' }}
    >
      <span className="inline-flex text-faint">
        <Inbox size={34} strokeWidth={1.5} />
      </span>
      <h3 className="t-h3 mt-4 text-ink">No talks scheduled yet</h3>
      <p className="mx-auto mt-1.5 max-w-[360px] text-sm text-muted">
        Schedule the first lunch-and-learn and people can start saving seats.
      </p>
      <div className="mt-5 flex justify-center">
        <button className={buttonStyles('primary', 'md')} onClick={onCreate}>
          <Plus size={17} strokeWidth={2.4} />
          Create talk
        </button>
      </div>
    </div>
  );
}

export function Banner({ message }: { message: string }): React.ReactElement {
  return (
    <div className="dh-alert dh-alert--danger mt-10" role="alert">
      <AlertCircle size={18} className="dh-alert__icon" />
      <span>{message}</span>
    </div>
  );
}
