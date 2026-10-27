"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ONBOARDING_KEY } from "../lib/api";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { Onboarding } from "./onboarding";
import { Splash } from "./splash";
import { colors, pageStyle } from "./styles";

const ReplayContext = createContext<() => void>(() => undefined);

export function useReplayOnboarding(): () => void {
  return useContext(ReplayContext);
}

type Gate = "splash" | "loading" | "onboarding" | "app";

export function ClientShell({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>("splash");

  useEffect(() => {
    const splashMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 200 : 1200;
    const timer = window.setTimeout(() => {
      setGate(window.localStorage.getItem(ONBOARDING_KEY) === "1" ? "app" : "onboarding");
    }, splashMs);
    return () => window.clearTimeout(timer);
  }, []);

  function finish(): void {
    window.localStorage.setItem(ONBOARDING_KEY, "1");
    setGate("app");
  }

  function replay(): void {
    window.localStorage.removeItem(ONBOARDING_KEY);
    setGate("onboarding");
  }

  if (gate === "splash") {
    return <Splash />;
  }

  if (gate === "loading") {
    return (
      <main style={pageStyle} aria-busy="true">
        <div className="cve-page">
          <p style={{ margin: 0 }}>Cargando…</p>
        </div>
      </main>
    );
  }

  if (gate === "onboarding") {
    return <Onboarding onDone={finish} />;
  }

  return (
    <ReplayContext.Provider value={replay}>
      <div className="cve-shell" style={{ background: colors.background, minHeight: "100vh" }}>
        <AppHeader />
        {children}
        <BottomNav />
      </div>
    </ReplayContext.Provider>
  );
}
