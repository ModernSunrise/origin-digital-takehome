'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { EventView } from '@/lib/domain/types';
import { api } from '@/lib/client/api';
import { useToast } from './toast';
import { friendlyError } from './talk-utils';
import { buttonStyles } from './ui';

export function TalkForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial?: EventView;
}): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const initialDate = initial ? toLocalInput(initial.date) : '';
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initialDate);
  const [maxCapacity, setMaxCapacity] = useState(initial ? String(initial.maxCapacity) : '30');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const capacity = Number(maxCapacity);
    // Client-side validation for instant feedback; the server stays the authority.
    if (!trimmedTitle) return toast('Give the talk a title.', 'error');
    if (!date) return toast('Pick a date and time.', 'error');
    if (!Number.isInteger(capacity) || capacity < 1) {
      return toast('Capacity must be a whole number of at least 1.', 'error');
    }

    setBusy(true);
    try {
      let result: EventView;
      if (initial) {
        // Only re-send `date` when the user actually changed it, so an untouched datetime
        // isn't silently re-rounded to whole minutes (it could carry seconds from MCP).
        result = await api.updateEvent(initial.id, {
          title: trimmedTitle,
          description: description.trim(),
          maxCapacity: capacity,
          ...(date !== initialDate ? { date: new Date(date).toISOString() } : {}),
        });
      } else {
        result = await api.createEvent({
          title: trimmedTitle,
          description: description.trim(),
          date: new Date(date).toISOString(),
          maxCapacity: capacity,
        });
      }
      toast(initial ? 'Talk updated.' : 'Talk scheduled.', 'success');
      router.push(`/events/${result.id}`);
    } catch (err) {
      toast(friendlyError(err), 'error');
      setBusy(false);
    }
  }

  const cancelHref = initial ? `/events/${initial.id}` : '/';

  return (
    <div className="mx-auto max-w-2xl pt-2">
      <Link href={cancelHref} className="font-mono text-xs text-faint transition-colors hover:text-muted">
        <span aria-hidden>←</span> cancel
      </Link>

      <h1 className="mt-5 flex items-baseline gap-2 font-mono text-lg" aria-label={mode === 'create' ? 'New talk' : 'Edit talk'}>
        <span className="text-accent">{mode === 'create' ? 'new_talk' : 'edit_talk'}</span>
        <span className="text-faint" aria-hidden>
          ()
        </span>
      </h1>

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-lg border border-line bg-panel p-6">
        <Field label="title" hint="required" htmlFor="talk-title">
          <input
            id="talk-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Building MCP Servers"
            className={inputCls}
            required
            aria-required="true"
            autoFocus
          />
        </Field>

        <Field label="description" htmlFor="talk-desc">
          <textarea
            id="talk-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One rule-set, two consumers. A look at the MCP server…"
            rows={3}
            className={`${inputCls} resize-y`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="date & time" hint="your local time" htmlFor="talk-date">
            <input
              id="talk-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputCls} [color-scheme:dark]`}
              required
              aria-required="true"
            />
          </Field>
          <Field label="capacity" hint="seats" htmlFor="talk-cap">
            <input
              id="talk-cap"
              type="number"
              min={1}
              step={1}
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              className={inputCls}
              required
              aria-required="true"
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={busy} className={buttonStyles('accent', 'md')}>
            {busy ? 'saving…' : mode === 'create' ? '▸ schedule talk' : '▸ save changes'}
          </button>
          <Link href={cancelHref} className={buttonStyles('ghost', 'md')}>
            cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-line bg-base px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-edge';

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-2">
        <span className="font-mono text-xs text-muted">{label}</span>
        {hint && <span className="font-mono text-[10px] text-faint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
