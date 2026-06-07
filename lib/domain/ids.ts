// The single source of identity. uuid generation kept behind a helper so it is the only
// other nondeterminism besides the clock, and easy to stub if a test needs a fixed id.
export function newId(): string {
  return crypto.randomUUID();
}
