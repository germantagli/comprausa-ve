"use client";

import { ApiClientError, getAccountProfile, revokeSession, type AccountProfile } from "@comprausa/api-client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { clearSession, readSession } from "../lib/session";
import { bodyStyle, buttonStyle, errorStyle, linkStyle, pageStyle, titleStyle } from "./styles";

type Phase =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; profile: AccountProfile };

export function ProfileScreen() {
  const [phase, setPhase] = useState<Phase>({ status: "loading" });
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setPhase({ status: "signed-out" });
      return;
    }
    let cancelled = false;
    setPhase({ status: "loading" });
    getAccountProfile(apiBase, session.accessToken)
      .then((profile) => {
        if (!cancelled) {
          setPhase({ status: "ready", profile });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase({ status: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  async function logout(): Promise<void> {
    const session = readSession();
    if (!session) {
      setPhase({ status: "signed-out" });
      return;
    }
    setBusy(true);
    setLogoutError(null);
    try {
      await revokeSession(apiBase, session.accessToken);
      clearSession();
      setPhase({ status: "signed-out" });
    } catch (caught) {
      setLogoutError(caught instanceof ApiClientError ? "No pudimos cerrar la sesión." : "No pudimos cerrar la sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Perfil</h1>
      {phase.status === "loading" ? (
        <p aria-busy="true" style={bodyStyle}>
          Cargando…
        </p>
      ) : null}
      {phase.status === "signed-out" ? (
        <p style={bodyStyle}>
          Entra para ver tu nombre.{" "}
          <Link href="/entrar" style={linkStyle}>
            Entrar
          </Link>
        </p>
      ) : null}
      {phase.status === "error" ? (
        <div>
          <p role="alert" style={errorStyle}>
            No pudimos cargar tu perfil.
          </p>
          <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
            Reintentar
          </button>
        </div>
      ) : null}
      {phase.status === "ready" ? (
        <div>
          <p style={bodyStyle}>{displayName(phase.profile)}</p>
          <button type="button" style={buttonStyle} onClick={() => void logout()} disabled={busy}>
            {busy ? "Espera…" : "Cerrar sesión"}
          </button>
          {logoutError ? (
            <p role="alert" style={errorStyle}>
              {logoutError}
            </p>
          ) : null}
        </div>
      ) : null}
      <p style={bodyStyle}>
        <Link href="/operador" style={linkStyle}>
          Revisión de pagos
        </Link>
      </p>
      <p style={bodyStyle}>
        <Link href="/ayuda" style={linkStyle}>
          Ayuda
        </Link>
      </p>
    </main>
  );
}

function displayName(profile: AccountProfile): string {
  const parts = [profile.givenName, profile.familyName].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  return parts.length > 0 ? parts.join(" ") : "Tu perfil no tiene nombre.";
}
