// Demo seed for the DevHub frontend. Idempotent — only seeds an empty store. Seeded lazily
// via ensureSeeded() from the route handlers. Goes through the SAME services as everything
// else (no direct store writes), so the seeded data obeys every business rule.
//
// The four talks are the chapters of the interview walkthrough (see app/_content/talks.tsx).
// Their titles are the join key to that content via talkFileName(), and ascending dates make
// the dashboard list them as chapters 1..4. Keep the titles in sync with the content module.

import { createEvent } from './event-service';
import { register } from './registration-service';
import { findAllEvents } from './store';
import { now } from './clock';

const DEMO_USER = 'you@devhub.io';

function at(daysFromNow: number, hour = 12, minute = 0): string {
  const d = now();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Memoized so the demo data is created exactly once per process, on the first API call
// that touches the store. This runs inside the SAME module graph as the route handlers, so
// it seeds the store they actually read — unlike instrumentation.ts, which bundles
// separately and would seed an orphan instance.
let seeding: Promise<void> | null = null;
export function ensureSeeded(): Promise<void> {
  seeding ??= seedStore();
  return seeding;
}

export async function seedStore(): Promise<void> {
  if ((await findAllEvents()).length > 0) return; // already seeded

  const ch1 = await createEvent({
    title: 'How I Began — My Workflow',
    description:
      'A fresh Claude Desktop chat seeded with the interview brief and the take-home — extracting Requirements, Constraints, and Assumptions, then writing the handoff prompt for Claude Code.',
    date: at(2, 12, 0),
    maxCapacity: 40,
  });

  const ch2 = await createEvent({
    title: 'My Context System — Design & Methodology',
    description:
      'The three-layer context-engineering schema: a lean index (CLAUDE.md), path-filtered rules, and on-demand deep context plus skills.',
    date: at(3, 12, 0),
    maxCapacity: 40,
  });

  const ch3 = await createEvent({
    title: 'The App — How It Meets the Requirements',
    description:
      'A pure domain/service layer with thin handlers over an in-memory store, the three business rules, 32 tests, and this DevHub frontend.',
    date: at(4, 12, 0),
    maxCapacity: 8, // small on purpose: the capacity rule is demoable live in this chapter
  });

  const ch4 = await createEvent({
    title: 'The MCP Server Layer',
    description:
      'One rule-set, two consumers: the same services and shared Zod schemas exposed as seven MCP tools over stdio.',
    date: at(5, 12, 0),
    maxCapacity: 30,
  });

  const ch5 = await createEvent({
    title: 'Where It Goes Next — Production & Roadmap',
    description:
      'The deliberate seams — the async store, the userId string, the excluded delete — and the concrete next steps: Cosmos DB, horizontal scale, Entra ID, soft-cancel, and observability on Azure.',
    date: at(6, 12, 0),
    maxCapacity: 40,
  });

  // Realistic attendee lists on the meta chapters.
  for (const name of ['priya', 'sam', 'lee', 'mei']) {
    await register(ch1.id, `${name}@devhub.io`);
  }
  for (const name of ['priya', 'sam', 'noah']) {
    await register(ch2.id, `${name}@devhub.io`);
  }
  for (const name of ['priya', 'sam', 'lee', 'noah']) {
    await register(ch4.id, `${name}@devhub.io`);
  }
  for (const name of ['priya', 'noah', 'mei']) {
    await register(ch5.id, `${name}@devhub.io`);
  }

  // Chapter 3 is the live rules playground: the demo user already holds a seat (duplicate rule
  // fires on "save seat", and unregister works), and it sits at 7/8 — switch the attendee in
  // the header to take the last seat, then once more to hit capacity (SOLD OUT). Editing the
  // date to the past makes the past-event rule demoable too.
  await register(ch3.id, DEMO_USER);
  for (let i = 1; i <= 6; i += 1) {
    await register(ch3.id, `dev${i}@devhub.io`);
  }
}
