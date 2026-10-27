"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_KEY } from "../lib/api";
import { readSession } from "../lib/session";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { Onboarding } from "./onboarding";
import { Splash } from "./splash";
import { colors, pageStyle } from "./styles";

const ReplayContext = createContext<() => void>(() => undefined);

export function useReplayOnboarding(): () => void {
  return useContext(ReplayContext);
}

type Gate = "checking" | "splash" | "onboarding" | "app";

function isPhoneViewport(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

export function ClientShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("checking");

  useEffect(() => {
    function resolve(): void {
      const phone = isPhoneViewport();
      const session = readSession();
      const seenOnboarding = window.localStorage.getItem(ONBOARDING_KEY) === "1";

      // En teléfono sin sesión: splash con Comenzar → registro/OTP. Nunca el buscador primero.
      if (phone && !session) {
        setGate("splash");
        return;
      }
      if (!seenOnboarding) {
        setGate("onboarding");
        return;
      }
      setGate("app");
    }

    resolve();
    const media = window.matchMedia("(max-width: 767px)");
    const onChange = () => resolve();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function finishOnboarding(): void {
    window.localStorage.setItem(ONBOARDING_KEY, "1");
    setGate("app");
  }

  function replay(): void {
    window.localStorage.removeItem(ONBOARDING_KEY);
    setGate("onboarding");
  }

  function onComenzar(): void {
    // Flujo maqueta: splash → registro/OTP. Sin OTP simulado en producción.
    router.push("/entrar");
  }

  if (gate === "checking") {
    return (
      <main style={pageStyle} aria-busy="true">
        <div className="cve-page">
          <p style={{ margin: 0 }}>Cargando…</p>
        </div>
      </main>
    );
  }

  if (gate === "splash") {
    return <Splash onComenzar={onComenzar} />;
  }

  if (gate === "onboarding") {
    return <Onboarding onDone={finishOnboarding} />;
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
