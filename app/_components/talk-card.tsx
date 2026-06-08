'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { ArrowRight, Calendar, CheckCircle, Plus } from 'lucide-react';
import type { EventView, Registration } from '@/lib/domain/types';
import { api } from '@/lib/client/api';
import { regsKey, revalidateEvent } from '@/lib/client/keys';
import { useCurrentUser } from './current-user';
import { useToast } from './toast';
import { buttonStyles, CapacityMeter, ChapterChip, StatusBadge } from './ui';
import { formatWhen, friendlyError, talkStatus } from './talk-utils';
import { chapterOrderFor } from '@/app/_content/talks';

export function TalkCard({ event }: { event: EventView }): React.ReactElement {
  const status = talkStatus(event);
  const past = status === 'PAST';
  const chapter = chapterOrderFor(event.title);
  const { userId } = useCurrentUser();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { data: regs } = useSWR<Registration[]>(regsKey(event.id), () =>
    api.listRegistrations(event.id),
  );
  const mySeat = regs?.some((r) => r.userId === userId) ?? false;

  async function saveSeat(): Promise<void> {
    setBusy(true);
    try {
      await api.register(event.id, userId);
      toast(`Seat saved — see you at “${event.title}”.`, 'success');
      await revalidateEvent(event.id);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={`dh-card ${past ? '' : 'dh-card--interactive'} flex flex-col`}
      style={{ opacity: past ? 0.62 : 1 }}
    >
      <div className="dh-card__body flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-[7px] overflow-hidden text-sm text-muted">
            <Calendar size={14} className="flex-none text-faint" />
            <span className="num truncate">{formatWhen(event.date)}</span>
          </span>
          <StatusBadge status={status} />
        </div>

        <h3 className="t-h3 mt-3.5">
          <Link href={`/events/${event.id}`} className="text-ink transition-colors hover:text-accent">
            {event.title}
          </Link>
        </h3>

        {chapter !== null ? (
          <div className="mt-2.5">
            <ChapterChip order={chapter} />
          </div>
        ) : null}

        {event.description ? (
          <p className="mt-2.5 line-clamp-2 text-sm leading-normal text-muted">{event.description}</p>
        ) : null}

        <CapacityMeter count={event.registrationCount} max={event.maxCapacity} className="mt-[18px]" />

        <div className="mt-[18px] flex items-center gap-2.5">
          {mySeat ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
              <CheckCircle size={16} strokeWidth={2} />
              You’re in
            </span>
          ) : status === 'OPEN' ? (
            <button className={buttonStyles('primary', 'sm')} disabled={busy} onClick={saveSeat}>
              <Plus size={15} strokeWidth={2.4} />
              {busy ? 'Saving…' : 'Save my seat'}
            </button>
          ) : (
            <button className={buttonStyles('secondary', 'sm')} disabled>
              {status === 'FULL' ? 'Full' : 'Registration closed'}
            </button>
          )}
          <Link href={`/events/${event.id}`} className={`${buttonStyles('ghost', 'sm')} ml-auto`}>
            Details
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
