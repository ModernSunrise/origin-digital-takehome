'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { AlertCircle, X } from 'lucide-react';
import type { EventView } from '@/lib/domain/types';
import { ApiError, api } from '@/lib/client/api';
import { useToast } from './toast';
import { friendlyError } from './talk-utils';

type FormMode = { mode: 'create' } | { mode: 'edit'; initial: EventView };
type TalkFormCtx = { openCreate: () => void; openEdit: (talk: EventView) => void };

const Ctx = createContext<TalkFormCtx | null>(null);

export function TalkFormProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [active, setActive] = useState<FormMode | null>(null);
  return (
    <Ctx.Provider
      value={{
        openCreate: () => setActive({ mode: 'create' }),
        openEdit: (talk) => setActive({ mode: 'edit', initial: talk }),
      }}
    >
      {children}
      {active ? <TalkFormModal form={active} onClose={() => setActive(null)} /> : null}
    </Ctx.Provider>
  );
}

export function useTalkForm(): TalkFormCtx {
  const value = useContext(Ctx);
  if (!value) throw new Error('useTalkForm must be used within TalkFormProvider');
  return value;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FieldErrors = { title?: string; date?: string; capacity?: string };

function TalkFormModal({ form, onClose }: { form: FormMode; onClose: () => void }): React.ReactElement {
  const toast = useToast();
  const initial = form.mode === 'edit' ? form.initial : null;
  const initialDate = initial ? toLocalInput(initial.date) : '';
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initialDate);
  const [capacity, setCapacity] = useState(initial ? String(initial.maxCapacity) : '30');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const current = initial?.registrationCount ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const t = title.trim();
    const cap = Number(capacity);
    const next: FieldErrors = {};
    if (!t) next.title = 'Give the talk a title.';
    if (!date) next.date = 'Pick a date and time.';
    if (!Number.isInteger(cap) || cap < 1) {
      next.capacity = 'Capacity must be a whole number of at least 1.';
    } else if (initial && cap < current) {
      next.capacity = `${current} attendees already have seats — capacity can’t go below ${current}.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      if (initial) {
        await api.updateEvent(initial.id, {
          title: t,
          description: description.trim(),
          maxCapacity: cap,
          ...(date !== initialDate ? { date: new Date(date).toISOString() } : {}),
        });
        await Promise.all([
          globalMutate(['event', initial.id]),
          globalMutate(['regs', initial.id]),
          globalMutate('events'),
        ]);
        toast('Talk updated.', 'success');
      } else {
        await api.createEvent({
          title: t,
          description: description.trim(),
          date: new Date(date).toISOString(),
          maxCapacity: cap,
        });
        await globalMutate('events');
        toast('Talk scheduled.', 'success');
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CAPACITY_BELOW_CURRENT') {
        setErrors({ capacity: err.message });
      } else {
        toast(friendlyError(err), 'error');
      }
      setBusy(false);
    }
  }

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto"
      style={{ padding: '6vh 20px 40px', background: 'rgba(5,6,7,0.5)', backdropFilter: 'blur(6px)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Edit talk' : 'Create talk'}
        className="dh-card w-full max-w-[560px]"
        style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-overlay)' }}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="t-h3 m-0">{initial ? 'Edit talk' : 'Create talk'}</h2>
          <button className="dh-iconbtn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-[18px] px-6 py-[22px]">
          <ModalField label="Title" hint="required" htmlFor="f-title" error={errors.title}>
            <input
              id="f-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Building MCP Servers"
              className={`dh-input ${errors.title ? 'dh-input--invalid' : ''}`}
            />
          </ModalField>

          <ModalField label="Description" htmlFor="f-desc">
            <textarea
              id="f-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One rule-set, two consumers — a look at the MCP server…"
              className="dh-input"
            />
          </ModalField>

          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 140px' }}>
            <ModalField label="Date & time" hint="local" htmlFor="f-date" error={errors.date}>
              <input
                id="f-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`dh-input ${errors.date ? 'dh-input--invalid' : ''}`}
              />
            </ModalField>
            <ModalField label="Capacity" hint="seats" htmlFor="f-cap" error={errors.capacity}>
              <input
                id="f-cap"
                type="number"
                min={1}
                step={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={`dh-input ${errors.capacity ? 'dh-input--invalid' : ''}`}
              />
            </ModalField>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" className="dh-btn dh-btn--primary dh-btn--md" disabled={busy}>
              {busy ? 'Saving…' : initial ? 'Save changes' : 'Schedule talk'}
            </button>
            <button type="button" className="dh-btn dh-btn--ghost dh-btn--md" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalField({
  label,
  hint,
  htmlFor,
  error,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  error?: string | undefined;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label htmlFor={htmlFor} className="dh-field__label">
        <span className="dh-field__name">{label}</span>
        {hint ? <span className="dh-field__hint">{hint}</span> : null}
      </label>
      {children}
      {error ? (
        <div className="dh-field__error" role="alert">
          <AlertCircle size={14} strokeWidth={2} />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
