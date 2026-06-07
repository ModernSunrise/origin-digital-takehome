import type { TalkStatus } from './talk-utils';

type ButtonVariant = 'accent' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

/** Shared button classes — used by both <button> and next/link <Link>. */
export function buttonStyles(variant: ButtonVariant = 'ghost', size: ButtonSize = 'md'): string {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md border font-mono font-medium tracking-tight transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45';
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-7 px-2.5 text-xs',
    md: 'h-9 px-3.5 text-[13px]',
  };
  const variants: Record<ButtonVariant, string> = {
    accent:
      'border-accent/30 bg-accent/15 text-accent hover:bg-accent/25 hover:border-accent/50 shadow-[0_0_0_1px_transparent]',
    ghost: 'border-line bg-panel text-ink hover:border-edge hover:bg-raised',
    danger: 'border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 hover:border-danger/50',
  };
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

const STATUS: Record<TalkStatus, { label: string; cls: string }> = {
  OPEN: { label: 'OPEN', cls: 'border-accent/40 bg-accent/10 text-accent' },
  SOLD_OUT: { label: 'SOLD OUT', cls: 'border-danger/40 bg-danger/10 text-danger' },
  ENDED: { label: 'ENDED', cls: 'border-line bg-transparent text-faint' },
};

export function StatusBadge({ status }: { status: TalkStatus }): React.ReactElement {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export function CapacityMeter({
  count,
  max,
  className = '',
}: {
  count: number;
  max: number;
  className?: string;
}): React.ReactElement {
  const ratio = max > 0 ? Math.min(1, count / max) : 1;
  const pct = Math.round(ratio * 100);
  const fill = ratio >= 1 ? 'bg-danger' : ratio >= 0.8 ? 'bg-warn' : 'bg-accent';
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between font-mono text-[11px]">
        <span className="text-faint">seats</span>
        <span className="tabular-nums text-muted">
          <span className={ratio >= 1 ? 'text-danger' : 'text-ink'}>{count}</span>
          <span className="text-faint"> / {max}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${count} of ${max} seats taken`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-raised"
      >
        <div
          className={`h-full origin-left rounded-full [animation:meter-grow_0.6s_cubic-bezier(0.22,1,0.36,1)_both] ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
