"use client";

import { listMyProductRequests, type ProductRequestView } from "@comprausa/api-client";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { PageFrame } from "../../components/page-frame";
import { buttonStyle, colors, secondaryButtonStyle } from "../../components/styles";
import { apiBase } from "../../lib/api";
import {
  formatRequestDate,
  formatUsdCents,
  requestStatusColor,
  requestStatusLabel,
  requestTitle,
} from "../../lib/product-request-ui";
import { readSession } from "../../lib/session";

type Filter = "ALL" | ProductRequestView["status"];

const filters: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Todas" },
  { id: "RECEIVED", label: "Recibidas" },
  { id: "IN_REVIEW", label: "En revisión" },
  { id: "QUOTED", label: "Cotizadas" },
  { id: "ACCEPTED", label: "Aceptadas" },
  { id: "REJECTED", label: "Rechazadas" },
];

type Phase =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: ProductRequestView[]; total: number };

export default function MisCotizacionesPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [phase, setPhase] = useState<Phase>({ status: "loading" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const session = readSession();
    if (!session?.accessToken) {
      setPhase({ status: "signed-out" });
      return;
    }
    let cancelled = false;
    setPhase({ status: "loading" });
    listMyProductRequests(apiBase, session.accessToken, {
      ...(filter === "ALL" ? {} : { status: filter }),
      page,
      pageSize: 20,
    })
      .then((result) => {
        if (!cancelled) setPhase({ status: "ready", items: result.items, total: result.total });
      })
      .catch(() => {
        if (!cancelled) setPhase({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [filter, page]);

  return (
    <PageFrame compact>
      <div style={root}>
        <Link href="/perfil" style={back}>
          ← Perfil
        </Link>
        <h1 style={title}>Mis cotizaciones</h1>

        <div style={tabs} role="tablist" aria-label="Filtro de estado">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => {
                setPage(1);
                setFilter(item.id);
              }}
              style={{
                ...tab,
                ...(filter === item.id ? tabActive : null),
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {phase.status === "signed-out" ? (
          <div style={empty}>
            <p style={body}>Inicia sesión para ver tus solicitudes.</p>
            <Link href={`/entrar?modo=entrar&next=${encodeURIComponent("/mis-cotizaciones")}`} style={{ ...buttonStyle, textDecoration: "none" }}>
              Entrar
            </Link>
          </div>
        ) : null}
        {phase.status === "loading" ? <p style={body}>Cargando…</p> : null}
        {phase.status === "error" ? <p style={{ ...body, color: "#B91C1C" }}>No pudimos cargar tus cotizaciones.</p> : null}
        {phase.status === "ready" && phase.items.length === 0 ? (
          <div style={empty}>
            <p style={body}>Aún no tienes solicitudes.</p>
            <Link href="/solicitar" style={{ ...buttonStyle, textDecoration: "none" }}>
              Solicitar producto
            </Link>
          </div>
        ) : null}
        {phase.status === "ready"
          ? phase.items.map((item) => (
              <article key={item.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <p style={cardTitle}>{requestTitle(item)}</p>
                    <p style={meta}>{item.requestNumber}</p>
                    <p style={meta}>{formatRequestDate(item.createdAt)} · Cant. {item.quantity}</p>
                    {item.quote?.status === "SENT" || item.quote?.status === "ACCEPTED" ? (
                      <p style={{ ...meta, color: colors.deep, fontWeight: 700 }}>
                        Total {formatUsdCents(item.quote.totalMinor)}
                      </p>
                    ) : null}
                  </div>
                  <span
                    style={{
                      ...badge,
                      alignSelf: "flex-start",
                      background: `${requestStatusColor[item.status]}18`,
                      color: requestStatusColor[item.status],
                    }}
                  >
                    {requestStatusLabel[item.status]}
                  </span>
                </div>
                <Link href={`/mis-cotizaciones/${encodeURIComponent(item.id)}`} style={{ ...secondaryButtonStyle, textAlign: "center", textDecoration: "none" }}>
                  Ver detalle
                </Link>
              </article>
            ))
          : null}

        {phase.status === "ready" && phase.total > 20 ? (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button type="button" disabled={page <= 1} style={secondaryButtonStyle} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </button>
            <button
              type="button"
              disabled={page * 20 >= phase.total}
              style={secondaryButtonStyle}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </div>
    </PageFrame>
  );
}

const root: CSSProperties = { display: "grid", gap: 14, margin: "0 auto", maxWidth: 560, width: "100%" };
const back: CSSProperties = { color: colors.primary, fontWeight: 700, textDecoration: "none" };
const title: CSSProperties = { color: colors.deep, fontSize: 24, fontWeight: 800, margin: 0 };
const body: CSSProperties = { color: colors.deep, margin: 0 };
const tabs: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const tab: CSSProperties = {
  background: "#F1F4F8",
  border: `1px solid ${colors.border}`,
  borderRadius: 999,
  color: colors.deep,
  cursor: "pointer",
  font: "inherit",
  fontSize: 13,
  fontWeight: 600,
  minHeight: 36,
  padding: "0 12px",
};
const tabActive: CSSProperties = { background: colors.primary, borderColor: colors.primary, color: "#fff" };
const card: CSSProperties = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  display: "grid",
  gap: 12,
  padding: 14,
};
const cardTitle: CSSProperties = { color: colors.deep, fontWeight: 700, margin: 0 };
const meta: CSSProperties = { color: colors.muted, fontSize: 13, margin: "4px 0 0" };
const badge: CSSProperties = { borderRadius: 999, fontSize: 12, fontWeight: 700, padding: "4px 10px", whiteSpace: "nowrap" };
const empty: CSSProperties = { display: "grid", gap: 12, justifyItems: "start" };
