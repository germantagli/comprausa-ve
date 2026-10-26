"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ONBOARDING_KEY } from "../lib/api";
import { BottomNav } from "./bottom-nav";
import { Onboarding } from "./onboarding";
import { colors, pageStyle } from "./styles";

const ReplayContext = createContext<() => void>(() => undefined);

export function useReplayOnboarding(): () => void {
  return useContext(ReplayContext);
}

export function ClientShell({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    setSeen(window.localStorage.getItem(ONBOARDING_KEY) === "1");
  }, []);

  function finish(): void {
    window.localStorage.setItem(ONBOARDING_KEY, "1");
    setSeen(true);
  }

  function replay(): void {
    window.localStorage.removeItem(ONBOARDING_KEY);
    setSeen(false);
  }

  if (seen === null) {
    return (
      <main style={pageStyle} aria-busy="true">
        <p style={{ margin: 0 }}>Cargando…</p>
      </main>
    );
  }

  if (!seen) {
    return <Onboarding onDone={finish} />;
  }

  return (
    <ReplayContext.Provider value={replay}>
      <div style={{ background: colors.background, minHeight: "100vh" }}>{children}</div>
      <BottomNav />
    </ReplayContext.Provider>
  );
}
