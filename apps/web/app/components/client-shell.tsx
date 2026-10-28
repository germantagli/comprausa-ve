"use client";

import { decideEntryGate, probeServerReachable, restoreAuthenticatedSession } from "@comprausa/api-client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiBase, ONBOARDING_KEY } from "../lib/api";
import { clearSession, readSession, saveSession } from "../lib/session";
import Image from "next/image";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { Onboarding } from "./onboarding";
import { Splash } from "./splash";
import { colors } from "./styles";

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
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      const phone = isPhoneViewport();
      const stored = readSession();
      const seenOnboarding = window.localStorage.getItem(ONBOARDING_KEY) === "1";
      const forceBienvenida = new URLSearchParams(window.location.search).get("bienvenida") === "1";

      if (forceBienvenida) {
        setGate("onboarding");
        void probeServerReachable(apiBase).then((reachable) => {
          if (!cancelled) {
            setServerReachable(reachable);
          }
        });
        return;
      }

      const restorePromise = restoreAuthenticatedSession(apiBase, stored);
      const healthPromise = probeServerReachable(apiBase);

      const { session, cleared } = await restorePromise;
      if (cancelled) {
        return;
      }
      if (cleared) {
        clearSession();
      } else if (session && session !== stored) {
        saveSession(session);
      }

      const nextGate = decideEntryGate({
        requiresSplash: phone,
        hasValidSession: Boolean(session),
        onboardingCompleted: seenOnboarding,
      });
      setGate(nextGate);

      void healthPromise.then((reachable) => {
        if (!cancelled) {
          setServerReachable(reachable);
        }
      });
    }

    void bootstrap();
    const media = window.matchMedia("(max-width: 767px)");
    const onChange = () => {
      void bootstrap();
    };
    media.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      media.removeEventListener("change", onChange);
    };
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
    router.push("/entrar?modo=registro");
  }

  function onIniciarSesion(): void {
    router.push("/entrar?modo=entrar");
  }

  if (gate === "checking") {
    return (
      <main
        style={{ background: "linear-gradient(180deg, #EAF3FF 0%, #FFFFFF 100%)", color: colors.text, minHeight: "100dvh" }}
        aria-busy="true"
      >
        <div className="cve-page" style={{ alignContent: "center", justifyItems: "center", minHeight: "100dvh", textAlign: "center" }}>
          <Image src="/brand/splash/app-mark.webp" alt="TraeLo" width={120} height={120} priority style={{ height: "auto", width: 120 }} />
          <p style={{ color: colors.muted, margin: "12px 0 0" }}>Cargando…</p>
        </div>
      </main>
    );
  }

  if (gate === "splash") {
    return <Splash onComenzar={onComenzar} onIniciarSesion={onIniciarSesion} serverReachable={serverReachable} />;
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
