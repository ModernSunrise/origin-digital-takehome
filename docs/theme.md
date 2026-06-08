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
- **Brand language:** Origin Digital. Warm off-white surfaces, near-black text, generous
  whitespace, one earned neon-lime accent. **Never use Origin's own logo or name** — the
  only brand glyph is the lime seat-dot in the DevHub wordmark.

## Visual direction — Origin Digital light

A calm, premium, **light-first** product surface. Confident and legible, with restraint:
the lime is rationed, the radii are moderate (premium, not pill-everywhere), and the soft
organic-gradient texture appears **once per screen** (behind the list hero, behind the
chapter reader) rather than on every card.

> **Light only.** This skin is scoped to a single light theme. There is **no dark theme
> and no theme toggle** — the dark mode and toggle that the design handoff sketched were
> deliberately cut. `app/globals.css` ships only the `:root` light tokens; there is no
> `[data-theme="dark"]` block and no persisted theme preference. (This replaces the
> earlier "developer-tool dark" direction entirely — no near-black IDE background, no
> monospace, no `this_week()` / `▸ new` terminal affectations.)

Ground truth for every value below is [`../app/globals.css`](../app/globals.css) (the
implemented token set + `dh-*` classes). The components in
[`../app/_components/`](../app/_components/) consume those tokens and classes; they set
class names and content only.

---

## Palette

All colors are CSS custom properties on `:root`, aliased to shadcn/ui-style semantic
names. Tailwind utilities (`bg-base`, `text-accent`, `border-line`, …) resolve to these
via the `@theme inline` mapping.

### Surfaces & text (warm paper ramp)

| Token | Value | Use |
| --- | --- | --- |
| `--background` (`--paper-100`) | `#F6F6F1` | page (warm off-white) |
| `--background-subtle` (`--paper-200`) | `#EFEFE8` | secondary surface, dashed wells |
| `--card` / `--popover` / `--input` (`--paper-0`) | `#FFFFFF` | cards, modals, inputs |
| `--card-raised` (`--paper-50`) | `#FAF9F5` | hover / nested rows / meter track |
| `--foreground` (`--ink-900`) | `#18180F` | primary text (warm near-black) |
| `--secondary-foreground` (`--ink-700`) | `#2A2A22` | field labels, secondary button text |
| `--muted-foreground` (`--ink-500`) | `#5B5C52` | secondary text |
| `--faint-foreground` (`--ink-400`) | `#6E6F64` | tertiary text (AA on white) |
| `--border` (`--paper-300`) | `#E4E3DA` | hairline border |
| `--border-strong` (`--paper-400`) | `#CFCEC3` | hover / focus border |

### The accent (the brand)

| Token | Value | Use |
| --- | --- | --- |
| `--primary` (`--lime-400`) | `#C7F94E` | neon-lime **fill** (buttons, wordmark dot, meter fill) |
| `--primary-foreground` | `#1A1B10` | dark text **on** lime |
| `--primary-pressed` (`--lime-500`) | `#B6EC33` | primary button hover/active |
| `--lime-600` | `#93C021` | deep pressed lime |
| `--accent-ink` (`--lime-800`) | `#4B6B0F` | accent **text / icons / borders** (deep green) |
| `--accent-subtle` | `color-mix(lime-400 26%)` | accent tint fills (badges, chips, "you" row) |
| `--accent-border` | `color-mix(accent-ink 34%)` | accent borders |
| `--ring` | `color-mix(accent-ink 55%)` | focus ring |
| `--primary-glow` | soft lime shadow | only behind the accent (primary hover, wordmark dot) |

### Status

| Token | Value | Use |
| --- | --- | --- |
| `--warning` (`--amber-600`) | `#B9740A` | "filling up" — meter at ≥ 80% capacity |
| `--destructive` (`--red-600`) | `#C92A1E` | full / error / destructive |
| `--destructive-subtle` | `color-mix(red-600 9%)` | danger badge / alert / danger-button fill |
| `--destructive-foreground` | `#FFFFFF` | text on solid destructive |

### The accent rule (important — verify before adding lime anywhere)

The neon lime is **earned**: it appears only on primary actions, active/selected states,
seat-capacity progress, chapter markers, and key numbers — nothing else.

- On this light theme, lime is only legible as a **FILL** (with dark `--primary-foreground`
  text on top). That is the primary button, the wordmark seat-dot
  (`bg-primary` in `site-header.tsx`), and the capacity-meter fill under 80%.
- Accent **TEXT, icons, and borders** must use **`--accent-ink`** (deep green `#4B6B0F`),
  surfaced in Tailwind as `text-accent` / `border-accent-border`. The wordmark "Hub", the
  "this week" stat, the OPEN badge, chapter chip, "you" chip, and success alerts all use
  accent-ink, not lime.
- **Never set lime as text on a light background.** It fails contrast.

### Organic-gradient motif

`.organic-gradient` layers three soft radial blooms (lime + a teal-green) at low opacity.
Used **once per screen** as texture — behind the list hero card and behind the chapter
reader header — never on ordinary surfaces.

---

## Typography

Loaded via `next/font` in `layout.tsx`; `globals.css` maps the CSS variables in `@theme`.

- **`--font-sans` → Space Grotesk** (`var(--font-space-grotesk)`): one geometric sans for
  **display, UI, and body**. Real character, excellent **tabular numerals** — used
  everywhere numbers appear (seat counts, times, capacity) via the `.num` helper
  (`font-variant-numeric: tabular-nums`).
- **`--font-serif` → Newsreader** (`var(--font-newsreader)`): a refined transitional serif
  used **only** inside the editorial chapter reader (`.t-read` / `.t-read-h`), to give
  long-form walkthrough content a "docs / insights" feel.
- **No monospace.** The brand has none; `--font-mono` is deliberately folded back into the
  sans so any leftover `font-mono` usage renders as Space Grotesk.

### Scale (rem, 16px base)

| Token | Size | Role |
| --- | --- | --- |
| `--fs-display` | 52px | hero / big numbers |
| `--fs-h1` | 36px | screen title (`.t-h1`, bold) |
| `--fs-h2` | 26px | section / detail talk title (`.t-h2`) |
| `--fs-h3` | 18px | card title (`.t-h3`) |
| `--fs-body-lg` | 17px | lead paragraph (`.t-body-lg`) |
| `--fs-body` | 15px | base body |
| `--fs-sm` | 13px | secondary / meta |
| `--fs-xs` | 11px | labels, eyebrows (`.t-label`, uppercase) |
| `--fs-read` / `--fs-read-h` | 19px / 28px | serif chapter body / heading |

Weights 400 / 500 / 600 / 700 (Space Grotesk); Newsreader ships 400 / 500 plus italic.
Tracking: `--ls-display -0.02em` (tighten display/H1),
`--ls-tight -0.01em`, `--ls-label 0.08em` (uppercase eyebrows). Line-heights run
`--lh-tight 1.08` → `--lh-relaxed 1.7` (the serif reader).

---

## Spacing, radius, motion

- **Spacing** is a 4px base (`--space-2…5` = 8, 12, 16, 24 in the shipped set). Layout is
  centered at `--container-max 1120px` with a fluid `--gutter clamp(1.25rem, 4vw, 2.5rem)`.
  Generous whitespace is a brand signal.
- **Radius:** `--radius-md 10px` (buttons, inputs), `--radius-lg 14px` (cards),
  `--radius-xl 20px` (hero / modal), `--radius-full 999px` (badges, chips, avatars, meter
  track). `--radius-xs 4px`, `--radius-sm 6px` for small chips and the focus ring.
- **Shadows** are soft and warm (tinted near-black, not pure black): `--shadow-md` for
  cards, `--shadow-lg` for toasts, `--shadow-overlay` for the modal scrim.
- **Motion:** `--ease-out cubic-bezier(.22,1,.36,1)`, default `--dur 180ms`
  (`--dur-fast 120ms`, `--dur-meter 600ms`). Keep it minimal; `prefers-reduced-motion` is
  honored globally. Avoid `opacity: 0` entrance states (they break thumbnails / print).

---

## Components (`dh-*` classes)

The React primitives in `app/_components/` are thin wrappers over global, `dh-`-prefixed
classes defined in `globals.css`. Hover / focus / disabled live in CSS; JSX sets class
names and content. The vocabulary:

| Class | What it is | Notes |
| --- | --- | --- |
| `.dh-btn` + `--primary` / `--secondary` / `--ghost` / `--danger`, `--sm/--md/--lg`, `--full` | Buttons (and `<Link>` styled as buttons) | primary = lime fill with glow on hover; danger = destructive-subtle fill |
| `.dh-iconbtn` | Square icon button | e.g. hover-reveal unregister ✕ |
| `.dh-badge` + `--open` / `--full` / `--past`, `.dh-badge__dot` | Status badge with a leading dot | OPEN = accent-ink on accent-subtle; FULL = destructive; PAST = faint on hairline |
| `.dh-chip` | Small accent tag | chapter chip, "you" chip — accent-ink on accent-subtle |
| `.dh-card` + `--interactive`, `.dh-card__body` | Surface card | interactive lifts 2px + brightens border on hover |
| `.dh-avatar` + `--me` | Attendee initials | `--me` variant tints accent for the current user |
| `.dh-field__label/__name/__hint/__error`, `.dh-input` (+ `--invalid`, `textarea`) | Form field + input | focus ring uses accent-ink; invalid uses destructive |
| `.dh-meter__head/__label/__count/__track/__fill` | Capacity meter | tabular `X / Y`; fill color is data-driven (see states) |
| `.dh-alert` + `--danger` / `--success` / `--neutral` | Inline banner | success = accent-ink; danger = destructive; neutral = subtle surface |
| `.dh-toast` + `--success` / `--error` / `--info` | Toast | stacks, auto-dismisses; lifted with `--shadow-lg` |

Tailwind semantic utilities are also available via `@theme inline`: `bg-base/-panel/-raised/-subtle`,
`text-ink/-muted/-faint/-accent/-primary-ink`, `border-line/-edge/-accent-border`,
`text-danger/-warn`, etc. Use these (or `var(--token)`) rather than raw hexes.

---

## Iconography

Standardize on **[lucide-react](https://lucide.dev)** (geometric, ~1.8px stroke,
`currentColor`). No emoji, no multicolor icons, no text glyphs. Icons in use across the
shipped components include `Plus`, `Pencil`, `Calendar`, `Users`, `ArrowLeft`,
`BookOpen`, `CheckCircle`, `X`, `AlertCircle`, `Lock`, and `Inbox`. The only brand glyph
is the lime **seat dot** in the wordmark ("Dev" + accent-ink "Hub" + the lime dot).

---

## Vocabulary & states (UI only; domain names unchanged)

**Talks** (never "events"), **sessions**, **seats / capacity**, **attendees**. A talk has
title, description, date/time, max capacity — **no speaker field**. Voice is calm,
concrete, sentence-case; no emoji; no terminal affectations. Numbers always read `X / Y`
(tabular).

| Domain (stays) | DevHub UI says |
| --- | --- |
| Event | talk / session |
| `maxCapacity` | seats / capacity |
| Registration | your seat |
| register / unregister | "Save my seat" / "Give up seat" |
| `userId` (email) | attendee / identifier |

### Status — `OPEN` / `FULL` / `PAST`

Status is derived in `talk-utils.ts` (`talkStatus`): **PAST takes precedence over FULL**
(a talk that has already started reads PAST even if it was full). The `TalkStatus` union
and `dh-badge--*` modifiers are `OPEN` / `FULL` / `PAST`; the badge **renders** sentence-
case labels (`Open` / `Full` / `Past`) via `ui.tsx`. These replace the old
`OPEN / SOLD OUT / ENDED` vocabulary.

Status is **never signaled by color alone** — every badge pairs a dot + a text label, and
FULL / PAST render *disabled* controls with an inline reason rather than failing on click.

### Capacity meter tones (`CapacityMeter` in `ui.tsx`)

The fill color is data-driven off the seats ratio:

- `< 80%` → `--primary` (lime fill) — plenty of room.
- `≥ 80%` (and not full) → `--warning` (amber) — filling up.
- `≥ 100%` → `--destructive` (red) — full; the count also turns red.

### The three rules as product copy

Rules are canonical in [`domain-model.md`](../.claude/core-context/domain-model.md); how
each surfaces (see `talk-detail.tsx` / `friendlyError` in `talk-utils.ts`):

- **R1 past talk** → `PAST` badge; register form disabled with a neutral alert (lock icon)
  **"This talk has already started — registration is closed."**
- **R2 at capacity** → `FULL` badge; register form disabled with a danger alert **"This
  talk is sold out. Seats free up if an attendee gives theirs up."**
- **R3 already registered** → success alert **"You have a seat for this talk — registered
  as <you>."** with a "Give up seat" danger button replacing the form (this `mySeat` branch
  takes precedence over the R1/R2 alerts; the give-up button is disabled once the talk is
  `PAST`).
- **Capacity-below-count on edit** → inline error from the API (`CAPACITY_BELOW_CURRENT`),
  surfaced verbatim, e.g. _"N attendees already have seats — capacity can't go below N."_

### Toasts & confirmations

Mutations confirm via toast (`toast(...)` in `talk-detail.tsx`): **"Seat saved."** on
register, **"Seat released."** on unregister. Errors map through `friendlyError` to the
specific R1/R2/R3 messages above.

### Seed data (a live demo on first load)

The store is seeded lazily on first request (`ensureSeeded()` in the route handlers). The
seed is the **five walkthrough chapters** of the build story (How I Began → My Context
System → The App → The MCP Layer → Where It Goes Next), dated in order so the dashboard
lists them ch.01–05, each with a chapter chip and a walkthrough reader on its detail page.
Chapter 3 ("The App") is seeded **7 / 8** with the current attendee already holding a seat,
so all three rules are demoable live on one talk: register again (R3 duplicate), fill the
last seat (R2 full), or edit its date into the past (R1). Seed talks live in
`lib/domain/seed.ts`; the walkthrough content in `app/_content/`.

---

## Screens

- **Talks list (dashboard).** Centered ≤ 1120px. `SiteHeader` = wordmark · attendee chip ·
  "Create talk" primary button (opens the modal). A hero card (`radius-xl`,
  `.organic-gradient`) with `H1 "Talks"`, the tagline, and two right-aligned stats
  (`scheduled`, and `this week` whose number is in accent-ink). Then **"This week"** and
  **"All talks"** sections, each a grid `repeat(auto-fill, minmax(300px, 1fr))`, gap 18.
  Loading = a 6-card skeleton grid (no spinner); empty = an inbox `EmptyState` with a
  Create-talk CTA; load failure = a danger `dh-alert`.
- **Talk detail.** Centered ≤ 880px, "← Talks" back link. A header zone (status badge +
  chapter chip, `H1`, when/relative time, description, a large capacity meter), then a
  numbered **"2 · Registration"** zone (an "Edit talk" secondary button, the attendee list
  with avatars / "you" chip / hover-reveal unregister, and the register form with its
  R1/R2/R3 states), then the **chapter walkthrough** (omitted when the talk has no
  chapter) — a `Card` whose header uses `.organic-gradient` and whose body is set in the
  Newsreader serif.
- **Create / edit talk is a MODAL** (`talk-form-modal.tsx`), not a route. It opens over a
  blurred scrim from the header / empty state / detail "Edit talk". The former
  `/events/new` and `/events/[id]/edit` routes now redirect.

---

Build constraints: [`../CLAUDE.md`](../CLAUDE.md). Where the frontend sits in the layers:
[`./architecture.md`](./architecture.md). The domain model, REST API, MCP tools, services,
and the 32 tests are **unchanged** — this skin was a presentation swap only.
