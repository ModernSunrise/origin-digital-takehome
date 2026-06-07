# Theme — DevHub

DevHub is the product **skin** over the generic Event Management core: an internal
**tech-talk & lunch-and-learn hub**. Employees browse upcoming talks and save a seat; an
AI assistant does the same over MCP. It exists to make the architecture concrete and to
make the MCP differentiator feel essential, not decorative.

> **Skin depth — the core stays generic.** `Event` / `Registration`, the `/api/events`
> routes, and the `create_event` / `register_for_event` MCP tool *names* are exactly as
> [`../.claude/core-context/domain-model.md`](../.claude/core-context/domain-model.md)
> defines them. DevHub themes only **presentation**: UI copy, seed data, visual design,
> and MCP tool *descriptions*. Nothing in the locked specs changes — a reusable events
> engine with a skin on top. That separation is itself a design talking point.

## Identity

- **Name:** DevHub
- **Tagline:** _Tech talks worth a lunch break._
- **Audience:** engineers / employees at a software org — and their AI assistant.

## Terminology (UI only; domain names unchanged)

| Domain (stays) | DevHub UI says |
| --- | --- |
| Event | talk / session |
| `maxCapacity` | seats |
| Registration | your seat |
| register / unregister | "Save my seat" / "Give up seat" |
| `userId` (email) | attendee |

## The three rules as product copy

Rules are canonical in [`domain-model.md`](../.claude/core-context/domain-model.md); here
is how each surfaces to a user:

- **R1 past talk** → badge **"Ended — registration closed,"** RSVP disabled.
- **R2 at capacity** → badge **"SOLD OUT,"** RSVP disabled.
- **R3 already registered** → **"You already have a seat for this talk."**
- **Capacity-below-count on edit** → inline error: _"N attendees already have seats — capacity can't go below N."_

## Seed data (covers every rule in a live demo)

| Title | When | Seats | Demonstrates |
| --- | --- | --- | --- |
| Intro to RAG on Azure | +2 days | 18 / 40 | normal, seats left |
| Building MCP Servers | +4 days | 6 / 30 | the headline talk |
| Bicep & Infra-as-Code | +3 days | 30 / 30 | **SOLD OUT** (R2) |
| Cosmos DB data modeling | +7 days | 3 / 25 | normal |
| Context Engineering 101 | **−5 days** | 40 / 40 | **Ended** (R1) |

Pre-register one attendee across a couple of talks so unregister (slot frees) and
double-register (R3) are demoable on first load.

## MCP tool descriptions (names unchanged, prose themed)

Same schemas as the REST side; DevHub voice. Example — `register_for_event`:
_"Save a seat for an attendee at an upcoming tech talk. Fails if the talk has ended, is
full, or the attendee already has a seat."_

## Visual direction — developer-tool dark

Distinctive, engineer-built feel. **No** generic-AI aesthetics — no purple/violet
gradients, no stock glassmorphism (the look the lunch-and-learn deck mocks).

- **Mood:** dark IDE / terminal. Confident, dense-but-legible, snappy.
- **Palette:** near-black slate background (≈ `#0B0E14`), slightly elevated surfaces
  (≈ `#11151F`), hairline borders (≈ `#1E2430`), one **electric accent** (lime/green
  `#7DF77D` or cyan `#34E2E2`) for primary actions and the brand mark; amber for "filling
  up," muted red for SOLD OUT / ENDED. Tune in implementation.
- **Type:** a clean UI sans (Geist Sans / Inter) **plus a monospace** (Geist Mono /
  JetBrains Mono) for metadata — seat counts, times, and file-styled talk titles
  (`mcp-servers.talk`).
- **Motifs:** command-bar header (`▸ new`); section headers as function calls
  (`this_week()`); capacity as a slim meter with a mono `6/30`; the RSVP button styled as
  a CLI action (`rsvp`).
- **Components to design:** talk card (status badge + capacity meter), this-week rail,
  all-talks grid, talk detail + attendee list, create/edit-talk form, RSVP / un-RSVP
  control, and empty / loading / error states.
- **Accessibility:** keep WCAG AA contrast for the accent on dark; never signal SOLD OUT /
  ENDED by color alone — always pair with text + an icon.

Build constraints: [`../CLAUDE.md`](../CLAUDE.md). Where the frontend sits in the layers:
[`./architecture.md`](./architecture.md).
