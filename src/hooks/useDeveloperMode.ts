// src/hooks/useDeveloperMode.ts
//
// Lightweight localStorage-backed developer mode toggle.
// Default: OFF — all internal data (token usage, rewrite counts,
// quality scores, agent telemetry) is hidden from the teacher view.
//
// When ON: internal panels become visible.
// Never stored in the database — browser-only preference.

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "eduagents:devMode";

function readStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useDeveloperMode(): {
  devMode: boolean;
  toggleDevMode: () => void;
  setDevMode: (v: boolean) => void;
} {
  const [devMode, setDevModeState] = useState<boolean>(readStorage);

  // Keep in sync if another tab or component changes it
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setDevModeState(e.newValue === "true");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setDevMode = useCallback((v: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
    } catch { /* ignore quota errors */ }
    setDevModeState(v);
  }, []);

  const toggleDevMode = useCallback(() => {
    setDevMode(!readStorage());
  }, [setDevMode]);

  return { devMode, toggleDevMode, setDevMode };
}
