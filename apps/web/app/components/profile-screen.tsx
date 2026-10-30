"use client";

import { ApiClientError, getAccountProfile, revokeSession, type AccountProfile } from "@comprausa/api-client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiBase } from "../lib/api";
import { isStaffProfile } from "../lib/product-request-ui";
import { clearSession, readSession } from "../lib/session";
import { PageFrame } from "./page-frame";
import {
  bodyStyle,
  buttonStyle,
  cardStyle,
  colors,
  errorStyle,
  headingStyle,
  linkStyle,
  mutedStyle,
  spaceTokens,
  titleStyle,
} from "./styles";

type Phase =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; profile: AccountProfile };

type MenuItem = { href: string; label: string; note?: string };

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
      // En teléfono volvemos al splash (Comenzar → registro/OTP), no al buscador.
      window.location.assign("/");
    } catch (caught) {
      setLogoutError(caught instanceof ApiClientError ? "No pudimos cerrar la sesión." : "No pudimos cerrar la sesión.");
    } finally {
      setBusy(false);
    }
  }

  const menu = useMemo(() => {
    const items: MenuItem[] = [
      { href: "/pedidos", label: "Mis pedidos" },
      { href: "/mis-cotizaciones", label: "Mis cotizaciones" },
      { href: "/ayuda", label: "Mis favoritos", note: "Todavía no está disponible." },
      { href: "/direccion", label: "Mi cuenta", note: "Direcciones y datos de entrega." },
      { href: "/notificaciones", label: "Notificaciones" },
      { href: "/ayuda", label: "Ayuda" },
    ];
    if (phase.status === "ready" && isStaffProfile(phase.profile)) {
      items.push({ href: "/admin", label: "Administración", note: "Solicitudes y cotizaciones." });
      items.push({ href: "/operador", label: "Revisión de pagos", note: "Requiere MFA." });
      items.push({ href: "/operador/pedidos", label: "Seguimiento de pedidos", note: "Requiere MFA." });
    }
    return items;
  }, [phase]);

  return (
    <PageFrame>
      <h1 style={titleStyle}>Perfil</h1>
      {phase.status === "loading" ? (
        <p aria-busy="true" style={bodyStyle}>
          Cargando…
        </p>
      ) : null}
      {phase.status === "signed-out" ? (
        <div style={cardStyle}>
          <p style={bodyStyle}>Entra para ver tu nombre.</p>
          <Link href="/entrar" style={{ ...buttonStyle, alignItems: "center", display: "inline-flex", textDecoration: "none" }}>
            Entrar
          </Link>
        </div>
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
        <div style={{ ...cardStyle, marginBottom: spaceTokens[4] }}>
          <p style={{ ...headingStyle, margin: 0 }}>{displayName(phase.profile)}</p>
          <p style={mutedStyle}>Cuenta TraeLo{isStaffProfile(phase.profile) ? ` · ${phase.profile.role}` : ""}</p>
        </div>
      ) : null}

      <nav aria-label="Cuenta" style={{ display: "grid", gap: 0 }}>
        {menu.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            style={{
              background: colors.surface,
              borderBottom: `1px solid ${colors.border}`,
              color: colors.text,
              display: "grid",
              gap: 4,
              minHeight: 56,
              padding: `${spaceTokens[3]}px ${spaceTokens[4]}px`,
              textDecoration: "none",
            }}
          >
            <span style={{ fontWeight: 600 }}>{item.label}</span>
            {item.note ? <span style={mutedStyle}>{item.note}</span> : null}
          </Link>
        ))}
      </nav>

      {phase.status === "ready" ? (
        <div style={{ marginTop: spaceTokens[6] }}>
          <button
            type="button"
            style={{ ...buttonStyle, background: colors.surface, border: `1px solid ${colors.error}`, color: colors.error }}
            onClick={() => void logout()}
            disabled={busy}
          >
            {busy ? "Espera…" : "Cerrar sesión"}
          </button>
          {logoutError ? (
            <p role="alert" style={errorStyle}>
              {logoutError}
            </p>
          ) : null}
        </div>
      ) : null}
      <p style={{ ...bodyStyle, marginTop: spaceTokens[4] }}>
        <Link href="/ayuda" style={linkStyle}>
          Ayuda
        </Link>
      </p>
    </PageFrame>
  );
}

function displayName(profile: AccountProfile): string {
  const parts = [profile.givenName, profile.familyName].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  return parts.length > 0 ? parts.join(" ") : "Tu perfil no tiene nombre.";
}
