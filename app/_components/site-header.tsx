'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useCurrentUser } from './current-user';
import { useTalkForm } from './talk-form-modal';
import { buttonStyles } from './ui';

export function SiteHeader(): React.ReactElement {
  const { openCreate } = useTalkForm();
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-[18px]">
      <Wordmark />
      <div className="flex items-center gap-2.5">
        <UserChip />
        <button className={buttonStyles('primary', 'md')} onClick={openCreate}>
          <Plus size={17} strokeWidth={2.4} />
          Create talk
        </button>
      </div>
    </header>
  );
}

function Wordmark(): React.ReactElement {
  return (
    <Link href="/" aria-label="Greenroom home" className="inline-flex items-center gap-[11px]">
      <span
        className="h-[11px] w-[11px] flex-none rounded-full bg-primary shadow-[var(--primary-glow)]"
        aria-hidden
      />
      <span className="text-[19px] font-bold tracking-[-0.02em] text-ink">
        Green<span className="text-accent">room</span>
      </span>
    </Link>
  );
}

function UserChip(): React.ReactElement {
  const { userId, setUserId } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(userId);

  if (editing) {
    return (
      <form
        className="flex"
        onSubmit={(e) => {
          e.preventDefault();
          setUserId(draft);
          setEditing(false);
        }}
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setUserId(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false);
          }}
          aria-label="Your attendee identifier"
          placeholder="you@example.com"
          className="dh-input"
          style={{ height: 40, width: 210, padding: '0 12px' }}
        />
      </form>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(userId);
        setEditing(true);
      }}
      aria-label={`Change attendee (currently ${userId})`}
      title="Change who you are — auth is out of scope; a user is just an identifier"
      className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-panel px-3 text-sm text-muted transition-colors hover:border-edge"
    >
      <span className="text-faint">as</span>
      <span className="text-ink">{userId}</span>
      <Pencil size={13} className="text-faint" />
    </button>
  );
}
