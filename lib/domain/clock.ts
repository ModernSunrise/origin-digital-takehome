// The single source of "now". Time is the only nondeterminism in the past-event rule
// (R1), so it is kept behind this helper: tests control it with vi.setSystemTime, and a
// future deployment could swap a real clock for an injected one. See
// .claude/rules/domain/service-layer-purity.md.
export function now(): Date {
  return new Date();
}
