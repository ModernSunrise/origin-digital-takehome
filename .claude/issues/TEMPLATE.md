# Issue: <short title>

> Copy this file to `NNN-kebab-title.md` (e.g. `001-vitest-store-leak.md`) when you
> solve a non-obvious bug. The point of the issues log is institutional memory:
> Claude should read past entries and **not re-investigate a problem we already solved**.
> One file per issue. Keep it tight (root cause + fix, not a transcript).

- **Status:** Resolved | Open | Mitigated
- **Date:** YYYY-MM-DD
- **Area:** domain | api | mcp | frontend | tests | build

## Symptom
What was observed. Exact error message / failing test name if there is one.

## Root cause
The actual underlying cause, not the surface symptom. One or two sentences.

## Fix
What changed, and where (`path/to/file.ts`). Link the commit/PR if relevant.

## Guard
How we prevent regression (a test, a rule in `.claude/rules/`, a type, an invariant).
If this revealed a missing rule, say which rule file now covers it.

## References
- Related issues: [[NNN-other-issue]]
- Related context: `../core-context/domain-model.md`, `../../docs/decisions.md#adr-00X`

---

### Example (delete when using)
**Symptom:** `RegistrationService` tests pass alone but fail when run together —
a user registered in test A is still present in test B.
**Root cause:** the in-memory store is a module singleton; state leaks across tests.
**Fix:** call `resetStore()` in a `beforeEach` (see `.claude/rules/testing/service-tests.md`).
**Guard:** the testing rule now mandates `resetStore()` between tests.
