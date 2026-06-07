'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import type { Registration } from '@/lib/domain/types';
import { ApiError, api } from '@/lib/client/api';
import { useCurrentUser } from './current-user';
import { useToast } from './toast';
import { Banner } from './dashboard';
import { CapacityMeter, StatusBadge, buttonStyles } from './ui';
import { formatWhen, friendlyError, talkFileName, talkStatus } from './talk-utils';
import { Walkthrough } from './walkthrough';

export function TalkDetail({ id }: { id: string }): React.ReactElement {
  const { userId } = useCurrentUser();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { data: event, error: eventError, mutate: mutateEvent } = useSWR(['event', id], () =>
    api.getEvent(id),
  );
  const { data: regs, error: regsError, mutate: mutateRegs } = useSWR(['regs', id], () =>
    api.listRegistrations(id),
  );

  if (eventError instanceof ApiError && eventError.status === 404) return <NotFound />;
  // Gate on BOTH resources so the seat control never renders against stale/empty
  // registrations, and a failed sub-fetch is surfaced rather than shown as "0 attendees".
  if (eventError || regsError) {
    return (
      <Banner
        glyph="✗"
        tone="danger"
        message="Could not load this talk."
        action={{
          label: 'retry',
          onClick: () => {
            void mutateEvent();
            void mutateRegs();
          },
        }}
      />
    );
  }
  if (!event || !regs) return <DetailSkeleton />;

  const status = talkStatus(event);
  const mySeat = regs.find((r) => r.userId === userId);
  const eventId = event.id;

  async function act(run: () => Promise<unknown>, success: string): Promise<void> {
    setBusy(true);
    try {
      await run();
      toast(success, 'success');
      // Revalidate this page's resources and the dashboard's list cache (seat counts).
      await Promise.all([mutateEvent(), mutateRegs(), globalMutate('events')]);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-2">
      <Link href="/" className="font-mono text-xs text-faint transition-colors hover:text-muted">
        <span aria-hidden>←</span> ~/talks
      </Link>

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[12px] text-accent/80">{talkFileName(event.title)}</span>
            <StatusBadge status={status} />
          </div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-ink">
            {event.title}
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">{formatWhen(event.date)}</p>

          {event.description ? (
            <p className="mt-6 max-w-prose leading-relaxed text-muted">{event.description}</p>
          ) : (
            <p className="mt-6 font-mono text-sm text-faint">{'// no description'}</p>
          )}

          <div className="mt-10">
            <h2
              className="mb-3 flex items-baseline gap-2 font-mono text-sm"
              aria-label={`Attendees — ${regs.length}`}
            >
              <span className="text-accent">attendees</span>
              <span className="text-faint" aria-hidden>
                () — {regs.length}
              </span>
            </h2>
            <AttendeeList regs={regs} me={userId} max={event.maxCapacity} />
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-line bg-panel p-5">
            <CapacityMeter count={event.registrationCount} max={event.maxCapacity} />

            <div className="mt-5">
              {mySeat ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-1.5 font-mono text-xs text-accent">
                    <span aria-hidden>✓</span> you have a seat
                  </p>
                  <button
                    onClick={() => void act(() => api.unregister(eventId, userId), 'Seat released.')}
                    disabled={busy}
                    className={`w-full ${buttonStyles('danger', 'md')}`}
                  >
                    {busy ? '…' : 'give up seat'}
                  </button>
                </div>
              ) : status === 'OPEN' ? (
                <button
                  onClick={() => void act(() => api.register(eventId, userId), 'Seat saved.')}
                  disabled={busy}
                  className={`w-full ${buttonStyles('accent', 'md')}`}
                >
                  {busy ? '…' : '+ save my seat'}
                </button>
              ) : (
                <button disabled className={`w-full ${buttonStyles('ghost', 'md')}`}>
                  {status === 'SOLD_OUT' ? 'sold out' : 'registration closed'}
                </button>
              )}
            </div>

            <p className="mt-3 font-mono text-[11px] leading-relaxed text-faint">
              registering as <span className="text-muted">{userId}</span>
            </p>
          </div>

          <Link href={`/events/${eventId}/edit`} className={`mt-3 w-full ${buttonStyles('ghost', 'md')}`}>
            edit talk
          </Link>
        </aside>
      </div>

      <Walkthrough event={event} />
    </div>
  );
}

function AttendeeList({
  regs,
  me,
  max,
}: {
  regs: Registration[];
  me: string;
  max: number;
}): React.ReactElement {
  if (regs.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line px-4 py-6 text-center font-mono text-xs text-faint">
        no seats taken yet — be the first
      </p>
    );
  }
  const sorted = [...regs].sort(
    (a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime(),
  );
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
      {sorted.map((r, i) => {
        const isMe = r.userId === me;
        return (
          <li
            key={r.id}
            className={`flex items-center gap-3 px-4 py-2.5 font-mono text-[13px] ${isMe ? 'bg-accent/5' : ''}`}
          >
            <span className="w-8 tabular-nums text-faint">{String(i + 1).padStart(2, '0')}</span>
            <span className={isMe ? 'text-accent' : 'text-ink'}>{r.userId}</span>
            {isMe && (
              <span className="rounded border border-accent/40 px-1 text-[10px] text-accent">you</span>
            )}
            <span className="ml-auto text-muted">{formatWhen(r.registeredAt)}</span>
          </li>
        );
      })}
      <li className="px-4 py-2 font-mono text-[11px] text-muted">
        {regs.length} / {max} seats taken
      </li>
    </ul>
  );
}

function NotFound(): React.ReactElement {
  return (
    <div className="pt-10 text-center">
      <p className="font-mono text-sm text-danger">404 — talk not found</p>
      <p className="mt-1 text-sm text-muted">It may have been removed, or the link is wrong.</p>
      <Link href="/" className={`mt-5 ${buttonStyles('ghost', 'md')}`}>
        <span aria-hidden>←</span> back to talks
      </Link>
    </div>
  );
}

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-8 pt-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded bg-panel" />
        <div className="h-4 w-40 animate-pulse rounded bg-panel" />
        <div className="h-24 w-full animate-pulse rounded bg-panel" />
      </div>
      <div className="h-44 animate-pulse rounded-lg border border-line bg-panel" />
    </div>
  );
}
