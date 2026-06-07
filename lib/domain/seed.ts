// Demo seed for the DevHub frontend. Idempotent — only seeds an empty store. Runs once on
// server boot via the root instrumentation.ts. Goes through the SAME services as everything
// else (no direct store writes), so the seeded data obeys every business rule.
//
// Chosen to make every state visible on first load: an OPEN talk you're already in, a
// SOLD OUT talk (R2), an ENDED talk (R1), and seats to take.

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

  const rag = await createEvent({
    title: 'Intro to RAG on Azure',
    description:
      'Retrieval-augmented generation end to end on Azure AI Search + Azure OpenAI — chunking, embeddings, and grounding answers in your own docs.',
    date: at(2, 12, 0),
    maxCapacity: 40,
  });

  const mcp = await createEvent({
    title: 'Building MCP Servers',
    description:
      'One rule-set, two consumers. How we exposed the same domain layer over both HTTP and the Model Context Protocol so an agent and a browser hit identical business logic.',
    date: at(4, 12, 30),
    maxCapacity: 30,
  });

  const bicep = await createEvent({
    title: 'Bicep & Infrastructure-as-Code',
    description:
      'Declarative Azure infra with Bicep modules, what-if deployments, and wiring it all into CI/CD. Hands-on — bring a laptop.',
    date: at(3, 12, 0),
    maxCapacity: 12,
  });

  const cosmos = await createEvent({
    title: 'Cosmos DB Data Modeling',
    description:
      'Partition keys, single-table patterns, and modeling for scale. When to embed, when to reference, and how to not get throttled.',
    date: at(9, 12, 0),
    maxCapacity: 25,
  });

  await createEvent({
    title: 'Context Engineering 101',
    description:
      'The talk that started it all — designing the information architecture around AI interactions. (Recording in the wiki.)',
    date: at(-5, 12, 0),
    maxCapacity: 40,
  });

  // Fill Bicep to capacity -> SOLD OUT (demonstrates R2 on first load).
  for (let i = 1; i <= bicep.maxCapacity; i += 1) {
    await register(bicep.id, `dev${i}@devhub.io`);
  }

  // Seats elsewhere, including the demo user (so "you have a seat" + unregister are demoable).
  await register(rag.id, DEMO_USER);
  await register(rag.id, 'priya@devhub.io');
  await register(mcp.id, DEMO_USER);
  await register(mcp.id, 'sam@devhub.io');
  await register(mcp.id, 'lee@devhub.io');
  await register(cosmos.id, 'priya@devhub.io');
}
