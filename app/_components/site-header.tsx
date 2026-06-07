'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCurrentUser } from './current-user';
import { buttonStyles } from './ui';

export function SiteHeader(): React.ReactElement {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 py-5">
      <Link href="/" className="flex items-center gap-2.5" aria-label="DevHub home">
        <span
          className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_2px_var(--color-accent)]"
          aria-hidden
        />
        <span className="font-mono text-[15px] font-bold tracking-tight text-ink">devhub</span>
        <span className="hidden font-mono text-xs text-faint sm:inline" aria-hidden>
          ~/talks
        </span>
      </Link>
      <div className="flex items-center gap-2.5">
        <CurrentUserChip />
        <Link href="/events/new" className={buttonStyles('accent', 'md')}>
          <span aria-hidden>▸</span> new talk
        </Link>
      </div>
    </header>
  );
}

function CurrentUserChip(): React.ReactElement {
  const { userId, setUserId } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(userId);

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setUserId(draft);
          setEditing(false);
        }}
        className="flex items-center"
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
          className="h-9 w-52 rounded-md border border-edge bg-panel px-2.5 font-mono text-xs text-ink outline-none placeholder:text-faint"
          placeholder="you@example.com"
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
      title="Change who you are (auth is out of scope — a user is just an identifier)"
      className="group flex h-9 items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 font-mono text-xs text-muted transition-colors hover:border-edge hover:text-ink"
    >
      <span className="text-faint" aria-hidden>
        as
      </span>
      <span className="text-accent">{userId}</span>
      <span className="text-faint transition-colors group-hover:text-muted" aria-hidden>
        ▾
      </span>
    </button>
  );
}
