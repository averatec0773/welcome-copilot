"use client";
// Single source of truth for the console's access-code state. The header
// UnlockChip (layout.tsx) is the only place a code is ever entered — any
// other page that needs a code (SimulatePanel, Assistant) calls
// promptUnlock() to send the visitor's eye there instead of asking again.
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type UnlockContextValue = {
  unlocked: boolean | null;
  refresh: () => void;
  promptUnlock: () => void;
  /** Bumped by promptUnlock(); the header chip watches this to open + flash. */
  promptSignal: number;
};

const UnlockCtx = createContext<UnlockContextValue | null>(null);

export function UnlockProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [promptSignal, setPromptSignal] = useState(0);

  const refresh = useCallback(() => {
    fetch("/api/unlock")
      .then((r) => r.json())
      .then((j) => setUnlocked(!!j.unlocked))
      .catch(() => setUnlocked(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const promptUnlock = useCallback(() => {
    setPromptSignal((n) => n + 1);
  }, []);

  return (
    <UnlockCtx.Provider value={{ unlocked, refresh, promptUnlock, promptSignal }}>
      {children}
    </UnlockCtx.Provider>
  );
}

export function useUnlock(): UnlockContextValue {
  const ctx = useContext(UnlockCtx);
  if (!ctx) throw new Error("useUnlock must be used within UnlockProvider");
  return ctx;
}
