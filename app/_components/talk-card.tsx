'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { EventView } from '@/lib/domain/types';
import { api } from '@/lib/client/api';
import { useCurrentUser } from './current-user';
import { useToast } from './toast';
import { CapacityMeter, StatusBadge, buttonStyles } from './ui';
import { formatWhen, friendlyError, talkFileName, talkStatus } from './talk-utils';

export function TalkCard({
  event,
  onChanged,
  index = 0,
}: {
  event: EventView;
  onChanged?: () => void;
  index?: number;
}): React.ReactElement {
  const status = talkStatus(event);
  const { userId } = useCurrentUser();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function saveSeat() {
    setBusy(true);
    try {
      await api.register(event.id, userId);
      toast(`Seat saved — see you at “${event.title}”.`, 'success');
      onChanged?.();
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className="fade-up flex flex-col rounded-lg border border-line bg-panel p-4 transition-colors hover:border-edge"
      style={{ animationDelay: `${Math.min(index, 9) * 45}ms` }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="font-mono text-[11px] text-faint">{formatWhen(event.date)}</span>
        <StatusBadge status={status} />
      </div>

      <Link
        href={`/events/${event.id}`}
        aria-label={`Open ${event.title}`}
        className="w-fit font-mono text-[12px] text-accent/80 transition-colors hover:text-accent"
      >
        {talkFileName(event.title)}
      </Link>
      <h3 className="mt-1 text-[17px] font-semibold leading-snug text-ink">
        <Link
          href={`/events/${event.id}`}
          className="underline-offset-4 decoration-edge hover:underline"
        >
          {event.title}
        </Link>
      </h3>
      {event.description ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{event.description}</p>
      ) : null}

      <CapacityMeter count={event.registrationCount} max={event.maxCapacity} className="mt-4" />

      <div className="mt-4 flex items-center gap-2">
        {status === 'OPEN' ? (
          <button onClick={saveSeat} disabled={busy} className={buttonStyles('accent', 'sm')}>
            {busy ? 'saving…' : '+ save seat'}
          </button>
        ) : (
          <button disabled className={buttonStyles('ghost', 'sm')}>
            {status === 'SOLD_OUT' ? 'sold out' : 'ended'}
          </button>
        )}
        <Link href={`/events/${event.id}`} className={buttonStyles('ghost', 'sm')}>
          details <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
