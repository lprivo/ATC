import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Entitlement } from './session';

interface EntitlementCtx {
  entitlement: Entitlement;
  /** Set by a purchase. There is no store yet (offline only), so nothing calls this outside dev. */
  setEntitlement: (e: Entitlement) => void;
}

const Ctx = createContext<EntitlementCtx | null>(null);

/** Free or full version. A local flag for now; a store purchase will set it later (no backend yet). */
export function EntitlementProvider({ children, initial = 'free' }: { children: ReactNode; /** Start free or full (stories). */ initial?: Entitlement }) {
  const [entitlement, setEntitlement] = useState<Entitlement>(initial);
  const value = useMemo(() => ({ entitlement, setEntitlement }), [entitlement]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlement() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEntitlement must be used inside EntitlementProvider');
  return ctx;
}
