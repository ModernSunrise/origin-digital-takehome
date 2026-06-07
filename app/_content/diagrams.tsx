import type { ReactElement, ReactNode } from 'react';

// Bespoke diagrams for the walkthrough chapters. Built from styled divs/borders (no images,
// deterministic — safe to render anywhere). Tokens from app/globals.css.

function PipeNode({ label, sub }: { label: string; sub?: string }): ReactElement {
  return (
    <div className="flex-1 rounded-md border border-line bg-panel px-3 py-2.5 text-center">
      <p className="font-mono text-[12px] text-ink">{label}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-faint">{sub}</p> : null}
    </div>
  );
}

function PipeArrow(): ReactElement {
  // Points down when the pipeline stacks (mobile), right when it's a row (>= sm).
  return (
    <span className="rotate-90 self-center px-1 font-mono text-accent sm:rotate-0" aria-hidden>
      →
    </span>
  );
}

/** Chapter 1: brief → requirements/constraints/assumptions → handoff → Claude Code. */
export function WorkflowPipeline(): ReactElement {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <PipeNode label="Claude Desktop" sub="interview + take-home" />
      <PipeArrow />
      <PipeNode label="Requirements" sub="Constraints · Assumptions" />
      <PipeArrow />
      <PipeNode label="Handoff prompt" sub="brief for Claude Code" />
      <PipeArrow />
      <PipeNode label="Claude Code" sub="builds the repo" />
    </div>
  );
}

function Layer({ name, detail, when }: { name: string; detail: string; when: string }): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-line border-l-2 border-l-accent bg-panel px-4 py-3">
      <div>
        <p className="font-mono text-[13px] text-ink">{name}</p>
        <p className="font-mono text-[11px] text-faint">{detail}</p>
      </div>
      <span className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
        {when}
      </span>
    </div>
  );
}

/** Chapter 2: the three context layers, increasing specificity. */
export function ContextLayers(): ReactElement {
  return (
    <div className="space-y-2">
      <Layer name="CLAUDE.md" detail="lean index — table of contents" when="always" />
      <Layer name=".claude/rules/" detail="path-filtered, one concern each" when="by file path" />
      <Layer
        name=".claude/core-context/ + skills/"
        detail="deep reference + packaged workflows"
        when="on demand"
      />
      <p className="pt-1 text-center font-mono text-[10px] text-faint">
        + issues · archive — institutional memory
      </p>
    </div>
  );
}

function ArchBox({ children, accent = false }: { children: ReactNode; accent?: boolean }): ReactElement {
  return (
    <div
      className={`rounded-md border px-4 py-2.5 text-center font-mono text-[12px] ${
        accent ? 'border-accent/40 bg-accent/5 text-accent' : 'border-line bg-panel text-ink'
      }`}
    >
      {children}
    </div>
  );
}

function ArchDown(): ReactElement {
  return (
    <div className="text-center font-mono text-[12px] text-faint" aria-hidden>
      ↓
    </div>
  );
}

/** Chapter 3: the layered architecture — two consumers over one pure core. */
export function AppArchitecture(): ReactElement {
  return (
    <div className="mx-auto max-w-md space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <ArchBox>app/api/** — HTTP</ArchBox>
        <ArchBox>mcp/** — tools</ArchBox>
      </div>
      <ArchDown />
      <ArchBox>lib/validation — shared Zod schemas</ArchBox>
      <ArchDown />
      <ArchBox accent>lib/domain — pure services · the 3 rules</ArchBox>
      <ArchDown />
      <ArchBox>in-memory store (singleton)</ArchBox>
    </div>
  );
}

/** Chapter 4: one rule-set, two consumers. */
export function McpDualConsumer(): ReactElement {
  return (
    <div className="mx-auto max-w-md space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-panel px-4 py-2.5 text-center">
          <p className="font-mono text-[12px] text-ink">REST API</p>
          <p className="font-mono text-[10px] text-faint">browser · HTTP</p>
        </div>
        <div className="rounded-md border border-line bg-panel px-4 py-2.5 text-center">
          <p className="font-mono text-[12px] text-ink">MCP server</p>
          <p className="font-mono text-[10px] text-faint">agent · stdio</p>
        </div>
      </div>
      <div className="text-center font-mono text-[12px] text-faint" aria-hidden>
        ↓
      </div>
      <div className="rounded-md border border-accent/40 bg-accent/5 px-4 py-3 text-center">
        <p className="font-mono text-[12px] text-accent">
          lib/domain services + shared Zod schemas
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-faint">one rule-set</p>
      </div>
      <div className="text-center font-mono text-[12px] text-faint" aria-hidden>
        ↓
      </div>
      <div className="rounded-md border border-line bg-panel px-4 py-2.5 text-center font-mono text-[12px] text-ink">
        in-memory store
      </div>
    </div>
  );
}

function CompareRow({ label, today, prod }: { label: string; today: string; prod: string }): ReactElement {
  return (
    <div className="grid grid-cols-1 items-center gap-x-2 gap-y-1.5 sm:grid-cols-[4.5rem_1fr_1.25rem_1fr]">
      <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</span>
      <span className="rounded-md border border-line bg-panel px-3 py-2 font-mono text-[11px] text-muted">
        {today}
      </span>
      <span className="hidden text-center font-mono text-accent sm:block" aria-hidden>
        →
      </span>
      <span className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 font-mono text-[11px] text-accent">
        {prod}
      </span>
    </div>
  );
}

/** Chapter 5: the same architecture, swapped behind its seams for production on Azure. */
export function TodayToProduction(): ReactElement {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-[4.5rem_1fr_1.25rem_1fr]">
        <span className="hidden sm:block" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Today · MVP</span>
        <span className="hidden sm:block" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
          In production · Azure
        </span>
      </div>
      <CompareRow label="Storage" today="in-memory Map singleton" prod="Cosmos DB containers" />
      <CompareRow label="Concurrency" today="single process" prod="ETag compare-and-swap" />
      <CompareRow label="Hosting" today="next dev · one container" prod="Container Apps · scale-to-zero" />
      <CompareRow label="Delivery" today="manual npm scripts" prod="GitHub Actions → ACR → deploy" />
      <CompareRow label="Identity" today="userId = trusted string" prod="Entra ID at the auth seam" />
    </div>
  );
}
