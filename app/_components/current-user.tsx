'use client';

import { createContext, useContext, useState } from 'react';

// Auth is out of scope — a "user" is just an identifier string (assumptions.md A1). The
// frontend holds a current attendee id so register/unregister have a "who". Session-scoped
// and editable from the header; persistence across reloads is intentionally out of scope.
type CurrentUser = { userId: string; setUserId: (id: string) => void };

const Ctx = createContext<CurrentUser | null>(null);
const DEFAULT_USER = 'you@greenroom.io';

export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [userId, setUserIdState] = useState<string>(DEFAULT_USER);
  const setUserId = (next: string): void => setUserIdState(next.trim() || DEFAULT_USER);
  return <Ctx.Provider value={{ userId, setUserId }}>{children}</Ctx.Provider>;
}

export function useCurrentUser(): CurrentUser {
  const value = useContext(Ctx);
  if (!value) throw new Error('useCurrentUser must be used within CurrentUserProvider');
  return value;
}
