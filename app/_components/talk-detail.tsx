'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Lock,
  Pencil,
  Plus,
  Users,
  X,
} from 'lucide-react';
import type { EventView, Registration } from '@/lib/domain/types';
import { ApiError, api } from '@/lib/client/api';
import { eventKey, regsKey, revalidateEvent } from '@/lib/client/keys';
import { useCurrentUser } from './current-user';
import { useToast } from './toast';
import { useTalkForm } from './talk-form-modal';
import { Banner } from './dashboard';
import { Walkthrough } from './walkthrough';
import { Avatar, buttonStyles, CapacityMeter, ChapterChip, StatusBadge } from './ui';
import { formatWhen, friendlyError, relativeTime, talkStatus } from './talk-utils';
import type { TalkStatus } from './talk-utils';
import { chapterOrderFor } from '@/app/_content/talks';

export function TalkDetail({ id }: { id: string }): React.ReactElement {
  const { userId } = useCurrentUser();
  const toast = useToast();
  const { openEdit } = useTalkForm();
  const [busy, setBusy] = useState(false);

  const { data: event, error } = useSWR(eventKey(id), () => api.getEvent(id));
  const { data: regs, error: regsError } = useSWR(regsKey(id), () => api.listRegistrations(id));

  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error || regsError) {
    return (
      <div className="mx-auto max-w-[880px]">
        <Banner message="Could not load this talk." />
      </div>
    );
  }
  if (!event || !regs) return <DetailSkeleton />;

  const status = talkStatus(event);
  const mySeat = regs.some((r) => r.userId === userId);
  const eventId = event.id;

  async function act(run: () => Promise<unknown>, success: string): Promise<void> {
    setBusy(true);
    try {
      await run();
      toast(success, 'success');
      await revalidateEvent(eventId);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const unregister = (u: string): Promise<void> =>
    act(() => api.unregister(eventId, u), 'Seat released.');

  return (
    <div className="mx-auto max-w-[880px]">
      <Link href="/" className={`${buttonStyles('ghost', 'sm')} mt-2`} style={{ paddingInline: 0 }}>
        <ArrowLeft size={16} />
        Talks
      </Link>

      <Header event={event} status={status} />

      <section className="mt-9">
        <div className="flex items-center justify-between gap-3">
          <ZoneLabel n="2">Registration</ZoneLabel>
          <button onClick={() => openEdit(event)} className={buttonStyles('secondary', 'sm')}>
            <Pencil size={14} />
            Edit talk
          </button>
        </div>
        <div className="dh-card">
          <div className="dh-card__body">
            <div className="mb-3.5 flex items-baseline gap-2">
              <Users size={16} className="text-faint" />
              <span className="font-semibold text-ink">Attendees</span>
              <span className="num text-faint">
                {regs.length} / {event.maxCapacity}
              </span>
            </div>
            <AttendeeList
              regs={regs}
              me={userId}
              canManage={status !== 'PAST'}
              busy={busy}
              onUnregister={unregister}
            />
            <RegisterForm
              status={status}
              user={userId}
              mySeat={mySeat}
              busy={busy}
              onRegister={(idf) => act(() => api.register(eventId, idf), 'Seat saved.')}
              onUnregister={unregister}
            />
          </div>
        </div>
      </section>

      <Walkthrough event={event} />
    </div>
  );
}

function ZoneLabel({ n, children }: { n: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className="num flex h-5 w-5 items-center justify-center rounded-[6px] border border-line text-[11px] font-semibold text-faint">
        {n}
      </span>
      <span className="t-label text-faint">{children}</span>
    </div>
  );
}

function Header({ event, status }: { event: EventView; status: TalkStatus }): React.ReactElement {
  const chapter = chapterOrderFor(event.title);
  return (
    <div className="mt-[22px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusBadge status={status} />
        {chapter !== null ? <ChapterChip order={chapter} /> : null}
      </div>
      <h1 className="t-h1 mt-3.5 text-ink">{event.title}</h1>
      <div className="mt-3 flex items-center gap-2 text-[length:var(--fs-body)] text-muted">
        <Calendar size={16} className="text-faint" />
        <span className="num">{formatWhen(event.date)}</span>
        <span className="text-faint">·</span>
        <span className="text-faint">{relativeTime(event.date)}</span>
      </div>
      {event.description ? (
        <p className="t-body-lg mt-[18px] max-w-[60ch] text-ink">{event.description}</p>
      ) : null}
      <div className="mt-6 max-w-[420px]">
        <CapacityMeter count={event.registrationCount} max={event.maxCapacity} size="lg" />
      </div>
    </div>
  );
}

function AttendeeList({
  regs,
  me,
  canManage,
  busy,
  onUnregister,
}: {
  regs: Registration[];
  me: string;
  canManage: boolean;
  busy: boolean;
  onUnregister: (userId: string) => void;
}): React.ReactElement {
  if (regs.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-line p-[22px] text-center text-sm text-faint">
        No seats taken yet — be the first.
      </p>
    );
  }
  const sorted = [...regs].sort(
    (a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime(),
  );
  return (
    <ul className="m-0 max-h-[300px] list-none overflow-y-auto rounded-[var(--radius-md)] border border-line p-0">
      {sorted.map((r) => (
        <li
          key={r.id}
          className="group flex items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-b-0"
          style={r.userId === me ? { background: 'var(--accent-subtle)' } : undefined}
        >
          <Avatar name={r.userId} me={r.userId === me} />
          <span
            className="text-sm"
            style={{ color: r.userId === me ? 'var(--accent-ink)' : 'var(--foreground)' }}
          >
            {r.userId}
          </span>
          {r.userId === me ? (
            <span className="dh-chip" style={{ height: 18 }}>
              you
            </span>
          ) : null}
          <span className="num ml-auto text-[length:var(--fs-xs)] text-faint">
            {formatWhen(r.registeredAt)}
          </span>
          {canManage ? (
            <button
              className={`dh-iconbtn group-hover:opacity-100 ${r.userId === me ? '' : 'opacity-0'} transition-opacity`}
              style={{ width: 28, height: 28 }}
              disabled={busy}
              onClick={() => onUnregister(r.userId)}
              title={`Unregister ${r.userId}`}
            >
              <X size={15} />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function RegisterForm({
  status,
  user,
  mySeat,
  busy,
  onRegister,
  onUnregister,
}: {
  status: TalkStatus;
  user: string;
  mySeat: boolean;
  busy: boolean;
  onRegister: (identifier: string) => void;
  onUnregister: (userId: string) => void;
}): React.ReactElement {
  const [identifier, setIdentifier] = useState(user);
  const past = status === 'PAST';
  const full = status === 'FULL';

  if (mySeat) {
    return (
      <div className="mt-[18px] flex flex-col gap-3">
        <div className="dh-alert dh-alert--success">
          <CheckCircle size={18} className="dh-alert__icon" />
          <span>
            You have a seat for this talk — registered as <strong>{user}</strong>.
          </span>
        </div>
        <button
          className={`${buttonStyles('danger', 'md')} self-start`}
          disabled={busy || past}
          onClick={() => onUnregister(user)}
        >
          Give up seat
        </button>
      </div>
    );
  }

  const blocked = past || full;
  return (
    <form
      className="mt-[18px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!blocked) onRegister(identifier.trim() || user);
      }}
    >
      {blocked ? (
        <div className={`dh-alert mb-3.5 ${past ? 'dh-alert--neutral' : 'dh-alert--danger'}`}>
          {past ? (
            <Lock size={18} className="dh-alert__icon" />
          ) : (
            <AlertCircle size={18} className="dh-alert__icon" />
          )}
          <span>
            {past
              ? 'This talk has already started — registration is closed.'
              : 'This talk is sold out. Seats free up if an attendee gives theirs up.'}
          </span>
        </div>
      ) : null}
      <label htmlFor="reg-id" className="dh-field__label">
        <span className="dh-field__name">Your identifier</span>
        <span className="dh-field__hint">email or name · no sign-in needed</span>
      </label>
      <div className="flex gap-2.5">
        <input
          id="reg-id"
          className="dh-input flex-1"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@example.com"
          disabled={blocked}
        />
        <button className={buttonStyles('primary', 'md')} disabled={blocked || busy}>
          <Plus size={17} strokeWidth={2.4} />
          Save my seat
        </button>
      </div>
    </form>
  );
}

function NotFound(): React.ReactElement {
  return (
    <div className="mx-auto max-w-[880px] pt-10 text-center">
      <p className="t-h3 text-danger">Talk not found</p>
      <p className="mt-1 text-sm text-muted">It may have been removed, or the link is wrong.</p>
      <Link href="/" className={`${buttonStyles('secondary', 'md')} mt-5`}>
        <ArrowLeft size={16} />
        Back to talks
      </Link>
    </div>
  );
}

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="mx-auto max-w-[880px] pt-6">
      <div className="h-9 w-2/3 rounded bg-panel" />
      <div className="mt-3 h-4 w-40 rounded bg-panel" />
      <div className="mt-6 h-44 rounded-[var(--radius-lg)] border border-line bg-panel" />
    </div>
  );
}
