import type { ReactElement } from 'react';
import { talkFileName } from '@/app/_components/talk-utils';
import {
  Bullets,
  Callout,
  CodeBlock,
  ContentSection,
  Figure,
  Mono,
  Prose,
  Steps,
  Subsection,
} from './content-blocks';
import {
  AppArchitecture,
  ContextLayers,
  McpDualConsumer,
  TodayToProduction,
  WorkflowPipeline,
} from './diagrams';

export interface TalkContent {
  readonly slug: string;
  readonly order: number;
  readonly render: () => ReactElement;
}

// NOTE: these `title`s are the join key to the seeded talks in lib/domain/seed.ts — they are
// turned into the content lookup slug via talkFileName(). Keep them byte-identical to the
// seed titles, or a chapter's walkthrough silently won't render. (Deliberate: content is a
// presentation concern keyed by slug; the domain model stays untouched.)
const CHAPTERS: readonly { title: string; order: number; render: () => ReactElement }[] = [
  {
    title: 'How I Began — My Workflow',
    order: 1,
    render: () => (
      <ContentSection name="the_workflow">
        <Prose>
          Before I write a line of code, I build context. I open a fresh Claude Desktop chat,
          drop in the interview brief and the take-home, and we define the problem together —
          requirements, then constraints, then assumptions — until the spec is unambiguous. Only
          then do I hand off to Claude Code to build.
        </Prose>
        <Figure caption="From the brief to the first commit">
          <WorkflowPipeline />
        </Figure>
        <Steps
          items={[
            {
              title: 'Seed the context',
              body: <>A Claude Desktop chat with the Origin Digital interview context and the take-home brief.</>,
            },
            {
              title: 'Define the Requirements',
              body: <>Pull the explicit asks out of the brief and pin each one down.</>,
            },
            {
              title: 'Define the Constraints',
              body: <>In-memory only, single process, the chosen stack, auth out of scope.</>,
            },
            {
              title: 'Define the Assumptions',
              body: <>The judgment calls the brief leaves open — stated explicitly, not guessed.</>,
            },
            {
              title: 'Write the handoff prompt',
              body: <>A precise brief that points Claude Code at the context system below.</>,
            },
            {
              title: 'Claude Code builds',
              body: <>Execution against a spec it can’t misread.</>,
            },
          ]}
        />
        <Callout label="Principle">
          Context before code. Define the problem precisely and the model fills the gaps with my
          intent — not the statistical mean of everything it has seen.
        </Callout>
        <Prose>
          The artifacts from this step are committed in <Mono>docs/requirements.md</Mono>,{' '}
          <Mono>docs/constraints.md</Mono>, and <Mono>docs/assumptions.md</Mono> — written before
          any feature code.
        </Prose>
      </ContentSection>
    ),
  },
  {
    title: 'My Context System — Design & Methodology',
    order: 2,
    render: () => (
      <ContentSection name="the_context_system">
        <Prose>
          The handoff lands in a context system I designed and gave a lunch-and-learn on. It is
          three layers of increasing specificity: a lean always-loaded index, path-filtered rules
          that load only for the files you touch, and deep reference plus packaged skills pulled
          in on demand.
        </Prose>
        <Figure caption="Three layers, loaded at the right time">
          <ContextLayers />
        </Figure>
        <Bullets
          items={[
            <>
              <strong className="text-ink">Reference over repetition</strong> — one canonical
              source; everything else links to it.
            </>,
            <>
              <strong className="text-ink">On-demand loading</strong> — deep docs and skills are
              read only when the task needs them.
            </>,
            <>
              <strong className="text-ink">Path-relevant context</strong> — editing{' '}
              <Mono>lib/domain</Mono> loads the domain rules, not the React ones.
            </>,
            <>
              <strong className="text-ink">Layered specificity</strong> — the right level of detail
              at the right moment.
            </>,
          ]}
        />
        <Callout label="Principle">
          Every token of context you load is a token stolen from reasoning. The goal is the right
          information at the right time — not all of it, all the time.
        </Callout>
        <Prose>
          You can see the whole system in this repo: <Mono>CLAUDE.md</Mono> (the index),{' '}
          <Mono>.claude/rules/</Mono> (path-filtered rules), <Mono>.claude/core-context/</Mono>{' '}
          (the precise spec), and the <Mono>.claude/skills/add-endpoint</Mono> workflow.
        </Prose>
      </ContentSection>
    ),
  },
  {
    title: 'The App — How It Meets the Requirements',
    order: 3,
    render: () => (
      <ContentSection name="the_app">
        <Prose>
          With the context locked, the build is straightforward. The take-home asks for an event
          API with three business rules, in-memory storage, unit tests, and a frontend. One
          principle drives the architecture: business rules live once, in a pure domain layer; the
          transport layers are thin adapters.
        </Prose>
        <Figure caption="Two consumers, one pure core">
          <AppArchitecture />
        </Figure>
        <Bullets
          items={[
            <>
              The three rules — no past-event registration, no over-capacity, no double-registration
              — are enforced in <Mono>lib/domain</Mono>, nowhere else.
            </>,
            <>Route handlers are thin: parse with a shared Zod schema, call one service, map the error to a status code.</>,
            <>Storage is an in-memory singleton behind an async interface — the swappable persistence seam.</>,
            <>
              <strong className="text-ink">32 unit tests</strong> target the service layer directly,
              covering every rule, edge, and boundary.
            </>,
            <>And this frontend you are looking at is the fourth consumer of that same API.</>,
          ]}
        />
        <Callout label="Principle">
          Business rules live once, in a pure domain layer. HTTP and MCP are just two doors into the
          same room.
        </Callout>
        <Callout tone="warn" label="Try it live">
          You already hold one of this talk’s eight seats, so <Mono>save seat</Mono> fires the
          duplicate rule. Switch the attendee in the header to take the last seat, then switch
          again to hit capacity (SOLD OUT). Or edit the date to yesterday and the past-event rule
          fires instead. Every toast is a domain error, mapped at the edge.
        </Callout>
        <Prose>
          The logic is in <Mono>lib/domain/</Mono>, the tests in{' '}
          <Mono>lib/domain/__tests__/</Mono>, and the full design in{' '}
          <Mono>docs/architecture.md</Mono>.
        </Prose>
      </ContentSection>
    ),
  },
  {
    title: 'The MCP Server Layer',
    order: 4,
    render: () => (
      <ContentSection name="the_mcp_layer">
        <Prose>
          The differentiator. Because the rules live in a pure layer, I could add a second consumer
          for free: an MCP server that exposes the same event API as tools an AI agent can call. It
          imports the same services and the same Zod schemas the HTTP handlers use — so the browser
          and the agent run identical business logic.
        </Prose>
        <Figure caption="One rule-set, two consumers">
          <McpDualConsumer />
        </Figure>
        <Bullets
          items={[
            <>Seven tools mirror the REST API one-to-one.</>,
            <>Inputs are validated by the same shared Zod schemas — one definition, two consumers.</>,
            <>Domain errors surface as MCP tool errors with a stable code the agent can branch on.</>,
            <>It runs over stdio as a separate process — its own in-memory store, by design.</>,
          ]}
        />
        <CodeBlock filename="terminal">{`npm run mcp                                   # start the server (stdio)
npx @modelcontextprotocol/inspector npm run mcp   # inspect it interactively`}</CodeBlock>
        <Callout label="Principle">
          One rule-set, two consumers. Add a rule once and the browser and the agent both get it —
          there is no second place for the logic to drift.
        </Callout>
        <Prose>
          The server is in <Mono>mcp/</Mono> and the design is documented in{' '}
          <Mono>.claude/core-context/mcp-server.md</Mono>.
        </Prose>
      </ContentSection>
    ),
  },
  {
    title: 'Where It Goes Next — Production & Roadmap',
    order: 5,
    render: () => (
      <ContentSection name="where_it_goes_next">
        <Prose>
          The honest version of what comes next. The best next step was designed in, not bolted on
          — it is the one the whole architecture was shaped around: swap the in-memory Maps for
          Azure Cosmos DB behind the eight async store accessors. One module changes; zero service
          signatures do. That single move unlocks horizontal scale, real hosting, and everything
          below it.
        </Prose>
        <Figure caption="Same service signatures. The seam is the store.">
          <TodayToProduction />
        </Figure>
        <Subsection label="1 · Persistence & scale">
          <Bullets
            items={[
              <>
                <strong className="text-ink">Cosmos DB behind the store</strong> — re-implement the
                eight async accessors against events and registrations containers; the services,
                handlers, MCP tools, and 32 tests are untouched because they already await.
              </>,
              <>
                <strong className="text-ink">Atomic capacity and uniqueness</strong> — the store is
                explicitly not concurrency-safe today, so two replicas could both pass the capacity
                check. An ETag compare-and-swap (retry on 412) makes the rule hold under load.
              </>,
              <>
                <strong className="text-ink">Container Apps, CI/CD, Bicep</strong> — the single
                process Dockerizes as-is; GitHub Actions chains the gates that already exist (test ·
                typecheck · lint · build) into a deploy.
              </>,
            ]}
          />
        </Subsection>
        <Subsection label="2 · Identity & trust">
          <Bullets
            items={[
              <>
                <strong className="text-ink">Entra ID at the userId seam</strong> — userId is a
                trusted string today. Derive it instead from a validated token (the{' '}
                <Mono>oid</Mono> claim) at the edge, and the (eventId, userId) uniqueness invariant
                carries over unchanged. Table stakes for a Microsoft shop.
              </>,
            ]}
          />
        </Subsection>
        <Subsection label="3 · Product completeness">
          <Bullets
            items={[
              <>
                <strong className="text-ink">Soft-cancel an event</strong> — hard-delete was
                excluded on purpose (ADR-004). A status field plus an{' '}
                <Mono>EventCancelledError</Mono> (mapped to 409) blocks new registrations while the
                history survives, instead of orphaning it.
              </>,
              <>
                <strong className="text-ink">Pagination and filtering</strong> on list events — a
                shared Zod query schema that maps one-to-one to a Cosmos query later, landing
                identically on the REST endpoint and the <Mono>list_events</Mono> tool.
              </>,
            ]}
          />
        </Subsection>
        <Subsection label="4 · Observability & confidence">
          <Bullets
            items={[
              <>
                <strong className="text-ink">OpenTelemetry to App Insights</strong> at the adapter
                edge — every domain error already carries a stable, low-cardinality code, so tagged
                spans give per-rule dashboards.
              </>,
              <>
                <strong className="text-ink">Integration and contract tests</strong> — the 32 units
                target the services and never touch HTTP. Add route round-trips and a
                Cosmos-emulator tier to prove the atomic capacity actually holds under contention.
              </>,
            ]}
          />
        </Subsection>
        <Callout label="Principle">
          The best next step was designed in, not bolted on. Every arrow on this slide lands on a
          seam I left open on purpose — the async store, the userId string, the excluded DELETE — so
          production is a swap behind a signature, never a rewrite.
        </Callout>
      </ContentSection>
    ),
  },
];

export const TALK_CONTENT: Readonly<Record<string, TalkContent>> = Object.fromEntries(
  CHAPTERS.map((c): [string, TalkContent] => {
    const slug = talkFileName(c.title);
    return [slug, { slug, order: c.order, render: c.render }];
  }),
);

export function getTalkContent(slug: string): TalkContent | undefined {
  return TALK_CONTENT[slug];
}

/** Chapter slugs in presentation order — for prev/next nav. */
export const ORDERED_SLUGS: readonly string[] = Object.values(TALK_CONTENT)
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((c) => c.slug);

/** The chapter number (1-based) for a talk title, or null if it isn't a chapter. */
export function chapterOrderFor(title: string): number | null {
  return getTalkContent(talkFileName(title))?.order ?? null;
}
