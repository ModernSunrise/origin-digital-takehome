import type { ReactElement, ReactNode } from 'react';

// Reusable content blocks for the walkthrough reader (light theme). Prose is the Newsreader
// serif reading voice; structured blocks (steps, bullets, callouts) stay in the sans.

/** A chapter body container. The reader card header carries the title. */
export function ContentSection({ children }: { name?: string; children: ReactNode }): ReactElement {
  return <div className="space-y-5">{children}</div>;
}

export function Prose({ children }: { children: ReactNode }): ReactElement {
  return <p className="t-read max-w-[64ch] text-ink">{children}</p>;
}

/** Inline code reference inside prose. */
export function Mono({ children }: { children: ReactNode }): ReactElement {
  return <code className="rounded bg-subtle px-1 py-0.5 text-[0.88em] text-accent">{children}</code>;
}

export function Steps({
  items,
}: {
  items: readonly { title: string; body?: ReactNode }[];
}): ReactElement {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={item.title} className="flex gap-3">
          <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-[11px] font-semibold text-accent">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <p className="font-medium text-ink">{item.title}</p>
            {item.body ? <div className="mt-0.5 text-sm text-muted">{item.body}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Bullets({ items }: { items: readonly ReactNode[] }): ReactElement {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-muted">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A labeled sub-group within a chapter. */
export function Subsection({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div>
      <p className="t-label mb-2 text-accent">{label}</p>
      {children}
    </div>
  );
}

export function Callout({
  tone = 'accent',
  label,
  children,
}: {
  tone?: 'accent' | 'warn' | 'danger';
  label?: string;
  children: ReactNode;
}): ReactElement {
  const left = tone === 'warn' ? 'border-l-warn' : tone === 'danger' ? 'border-l-danger' : 'border-l-accent';
  const labelColor = tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-accent';
  return (
    <div className={`rounded-md border border-line border-l-[3px] ${left} bg-subtle px-4 py-3`}>
      {label ? <p className={`t-label mb-1 ${labelColor}`}>{label}</p> : null}
      <div className="text-sm leading-relaxed text-ink">{children}</div>
    </div>
  );
}

export function CodeBlock({
  filename,
  children,
}: {
  filename?: string;
  children: string;
}): ReactElement {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-subtle">
      {filename ? (
        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-edge" aria-hidden />
          <span className="text-[11px] text-faint">{filename}</span>
        </div>
      ) : null}
      <pre className="overflow-x-auto px-4 py-3 text-[12.5px] leading-relaxed text-ink">{children}</pre>
    </div>
  );
}

export function Figure({ caption, children }: { caption?: string; children: ReactNode }): ReactElement {
  return (
    <figure className="rounded-lg border border-line bg-subtle p-5">
      {children}
      {caption ? (
        <figcaption className="mt-3 text-center text-[11px] text-faint">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
