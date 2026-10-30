"use client";

import { listInboxNotifications, markInboxNotificationRead } from "@comprausa/api-client";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { PageFrame } from "../../components/page-frame";
import { buttonStyle, colors, secondaryButtonStyle } from "../../components/styles";
import { apiBase } from "../../lib/api";
import { formatRequestDate } from "../../lib/product-request-ui";
import { readSession } from "../../lib/session";

type Item = {
  id: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
};

type Phase =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: Item[]; unreadCount: number };

export default function NotificacionesPage() {
  const [phase, setPhase] = useState<Phase>({ status: "loading" });

  async function reload(): Promise<void> {
    const session = readSession();
    if (!session?.accessToken) {
      setPhase({ status: "signed-out" });
      return;
    }
    const result = await listInboxNotifications(apiBase, session.accessToken);
    setPhase({ status: "ready", items: result.items, unreadCount: result.unreadCount });
  }

  useEffect(() => {
    let cancelled = false;
    setPhase({ status: "loading" });
    reload().catch(() => {
      if (!cancelled) setPhase({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function markRead(id: string): Promise<void> {
    const session = readSession();
    if (!session?.accessToken) return;
    await markInboxNotificationRead(apiBase, session.accessToken, id);
    await reload();
  }

  return (
    <PageFrame compact>
      <div style={root}>
        <Link href="/perfil" style={back}>
          ← Perfil
        </Link>
        <h1 style={title}>Notificaciones</h1>
        {phase.status === "signed-out" ? (
          <p style={body}>
            <Link href={`/entrar?modo=entrar&next=${encodeURIComponent("/notificaciones")}`} style={back}>
              Inicia sesión
            </Link>{" "}
            para ver tu bandeja.
          </p>
        ) : null}
        {phase.status === "loading" ? <p style={body}>Cargando…</p> : null}
        {phase.status === "error" ? <p style={{ ...body, color: "#B91C1C" }}>No pudimos cargar las notificaciones.</p> : null}
        {phase.status === "ready" ? (
          <>
            <p style={meta}>{phase.unreadCount} sin leer</p>
            {phase.items.length === 0 ? <p style={body}>No tienes notificaciones.</p> : null}
            {phase.items.map((item) => (
              <article key={item.id} style={{ ...card, opacity: item.readAt ? 0.72 : 1 }}>
                <p style={cardTitle}>{item.title}</p>
                <p style={body}>{item.message}</p>
                <p style={meta}>{formatRequestDate(item.createdAt)}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {item.relatedEntityType === "ProductRequest" && item.relatedEntityId ? (
                    <Link
                      href={`/mis-cotizaciones/${encodeURIComponent(item.relatedEntityId)}`}
                      style={{ ...secondaryButtonStyle, textDecoration: "none" }}
                    >
                      Ver solicitud
                    </Link>
                  ) : null}
                  {!item.readAt ? (
                    <button type="button" style={buttonStyle} onClick={() => void markRead(item.id)}>
                      Marcar leída
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </>
        ) : null}
      </div>
    </PageFrame>
  );
}

const root: CSSProperties = { display: "grid", gap: 14, margin: "0 auto", maxWidth: 560, width: "100%" };
const back: CSSProperties = { color: colors.primary, fontWeight: 700, textDecoration: "none" };
const title: CSSProperties = { color: colors.deep, fontSize: 24, fontWeight: 800, margin: 0 };
const body: CSSProperties = { color: colors.deep, margin: 0 };
const meta: CSSProperties = { color: colors.muted, fontSize: 13, margin: 0 };
const card: CSSProperties = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  display: "grid",
  gap: 8,
  padding: 14,
};
const cardTitle: CSSProperties = { color: colors.deep, fontWeight: 700, margin: 0 };
