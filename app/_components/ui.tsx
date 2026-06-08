import { BookOpen } from 'lucide-react';
import type { TalkStatus } from './talk-utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

/** Shared button classes (dh-btn) — used by both <button> and next/link <Link>. */
export function buttonStyles(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md'): string {
  return `dh-btn dh-btn--${variant} dh-btn--${size}`;
}

const STATUS: Record<TalkStatus, { mod: string; label: string }> = {
  OPEN: { mod: 'open', label: 'Open' },
  FULL: { mod: 'full', label: 'Full' },
  PAST: { mod: 'past', label: 'Past' },
};

export function StatusBadge({ status }: { status: TalkStatus }): React.ReactElement {
  const s = STATUS[status];
  return (
    <span className={`dh-badge dh-badge--${s.mod}`}>
      <span className="dh-badge__dot" aria-hidden />
      {s.label}
    </span>
  );
}

export function CapacityMeter({
  count,
  max,
  size = 'md',
  className = '',
}: {
  count: number;
  max: number;
  size?: 'md' | 'lg';
  className?: string;
}): React.ReactElement {
  const ratio = max > 0 ? Math.min(1, count / max) : 1;
  const pct = Math.round(ratio * 100);
  const tone = ratio >= 1 ? 'var(--destructive)' : ratio >= 0.8 ? 'var(--warning)' : 'var(--primary)';
  const full = ratio >= 1;
  return (
    <div className={className}>
      <div className="dh-meter__head">
        <span className="dh-meter__label">Seats</span>
        <span className="dh-meter__count" style={full ? { color: 'var(--destructive)' } : undefined}>
          <span className="now">{count}</span>
          <span className="of"> / {max}</span>
        </span>
      </div>
      <div
        className="dh-meter__track"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${count} of ${max} seats taken`}
        style={size === 'lg' ? { height: 8 } : undefined}
      >
        <div className="dh-meter__fill" style={{ width: `${pct}%`, background: tone }} />
      </div>
    </div>
  );
}

export function Avatar({ name, me = false }: { name: string; me?: boolean }): React.ReactElement {
  const initials =
    name
      .replace(/@.*$/, '')
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0))
      .join('')
      .toUpperCase() || '?';
  return (
    <span className={me ? 'dh-avatar dh-avatar--me' : 'dh-avatar'} title={name}>
      {initials}
    </span>
  );
}

export function ChapterChip({ order }: { order: number }): React.ReactElement {
  return (
    <span className="dh-chip" title="This talk has a walkthrough chapter">
      <BookOpen size={13} strokeWidth={2} />
      Chapter {String(order).padStart(2, '0')}
    </span>
  );
}
