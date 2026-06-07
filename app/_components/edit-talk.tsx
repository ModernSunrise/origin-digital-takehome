'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ApiError, api } from '@/lib/client/api';
import { TalkForm } from './talk-form';
import { buttonStyles } from './ui';

export function EditTalk({ id }: { id: string }): React.ReactElement {
  const { data: event, error } = useSWR(['event', id], () => api.getEvent(id));

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="pt-12 text-center">
        <p className="font-mono text-sm text-danger">404 — talk not found</p>
        <Link href="/" className={`mt-5 ${buttonStyles('ghost', 'md')}`}>
          <span aria-hidden>←</span> back to talks
        </Link>
      </div>
    );
  }
  if (error) {
    return <p className="pt-12 text-center font-mono text-sm text-danger">Could not load this talk.</p>;
  }
  if (!event) {
    return <p className="pt-12 text-center font-mono text-sm text-faint">loading…</p>;
  }
  return <TalkForm mode="edit" initial={event} />;
}
