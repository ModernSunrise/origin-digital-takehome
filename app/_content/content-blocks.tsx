import type { ReactElement, ReactNode } from 'react';

// Reusable styled "content blocks" for the presentation walkthrough, in the dark-IDE
// aesthetic (tokens from app/globals.css). No hooks — these render inside the client
// TalkDetail tree but are themselves transport-agnostic presentational components.

/** A chapter section with a function-call-style heading, matching the `attendees ()` motif. */
export function ContentSection({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div>
      <h2 className="mb-5 flex items-baseline gap-2 font-mono text-sm">
        <span className="text-accent">{name}</span>
        <span className="text-faint" aria-hidden>
          ()
        </span>
      </h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }): ReactElement {
  return <p className="max-w-prose leading-relaxed text-muted">{children}</p>;
}

/** Inline monospace reference, e.g. a file path inside prose. */
export function Mono({ children }: { children: ReactNode }): ReactElement {
  return (
    <code className="rounded bg-raised px-1 py-0.5 font-mono text-[0.85em] text-accent/90">
      {children}
    </code>
  );
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
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-panel font-mono text-[11px] text-accent">
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
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A labeled sub-group within a section — a mono accent label over its children. */
export function Subsection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div>
      <p className="mb-2 font-mono text-[12px] text-accent">{label}</p>
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
  const left =
    tone === 'warn' ? 'border-l-warn' : tone === 'danger' ? 'border-l-danger' : 'border-l-accent';
  const labelColor =
    tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-accent';
  return (
    <div className={`rounded-md border border-line ${left} border-l-2 bg-raised/40 px-4 py-3`}>
      {label ? (
        <p className={`mb-1 font-mono text-[10px] uppercase tracking-[0.14em] ${labelColor}`}>
          {label}
        </p>
      ) : null}
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
    <div className="overflow-hidden rounded-md border border-line bg-base">
      {filename ? (
        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-edge" aria-hidden />
          <span className="font-mono text-[11px] text-faint">{filename}</span>
        </div>
      ) : null}
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink">
        {children}
      </pre>
    </div>
  );
}

export function Figure({
  caption,
  children,
}: {
  caption?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <figure className="rounded-lg border border-line bg-base/50 p-5">
      {children}
      {caption ? (
        <figcaption className="mt-3 text-center font-mono text-[11px] text-faint">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
