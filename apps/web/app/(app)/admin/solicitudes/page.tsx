"use client";

import {
  getAccountProfile,
  listAdminProductRequests,
  type ProductRequestView,
} from "@comprausa/api-client";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { PageFrame } from "../../../components/page-frame";
import { buttonStyle, colors, inputStyle, secondaryButtonStyle } from "../../../components/styles";
import { apiBase } from "../../../lib/api";
import {
  formatRequestDate,
  isStaffProfile,
  requestStatusColor,
  requestStatusLabel,
  requestTitle,
} from "../../../lib/product-request-ui";
import { readSession } from "../../../lib/session";

type Filter = "ALL" | ProductRequestView["status"];

const filters: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Todas" },
  { id: "RECEIVED", label: "Recibidas" },
  { id: "IN_REVIEW", label: "En revisión" },
  { id: "QUOTED", label: "Cotizadas" },
  { id: "ACCEPTED", label: "Aceptadas" },
  { id: "REJECTED", label: "Rechazadas" },
  { id: "CANCELLED", label: "Canceladas" },
];

type Phase =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; items: ProductRequestView[]; total: number };

export default function AdminSolicitudesPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [page, setPage] = useState(1);
  const [phase, setPhase] = useState<Phase>({ status: "loading" });
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    const sync = () => setWide(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session?.accessToken) {
      setPhase({ status: "signed-out" });
      return;
    }
    let cancelled = false;
    setPhase({ status: "loading" });
    (async () => {
      try {
        const profile = await getAccountProfile(apiBase, session.accessToken);
        if (!isStaffProfile(profile)) {
          if (!cancelled) setPhase({ status: "forbidden" });
          return;
        }
        const result = await listAdminProductRequests(apiBase, session.accessToken, {
          ...(filter === "ALL" ? {} : { status: filter }),
          ...(appliedQ ? { q: appliedQ } : {}),
          page,
          pageSize: 20,
        });
        if (!cancelled) setPhase({ status: "ready", items: result.items, total: result.total });
      } catch {
        if (!cancelled) setPhase({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter, appliedQ, page]);

  function onSearch(event: FormEvent): void {
    event.preventDefault();
    setPage(1);
    setAppliedQ(q.trim());
  }

  return (
    <PageFrame wide compact>
      <div style={root}>
        <Link href="/admin" style={back}>
          ← Administración
        </Link>
        <h1 style={title}>Solicitudes</h1>

        <form onSubmit={onSearch} style={searchRow}>
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por número, producto o cliente"
            style={{ ...inputStyle, flex: 1 }}
            aria-label="Buscar solicitudes"
          />
          <button type="submit" style={buttonStyle}>
            Buscar
          </button>
        </form>

        <div style={tabs}>
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPage(1);
                setFilter(item.id);
              }}
              style={{ ...tab, ...(filter === item.id ? tabActive : null) }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {phase.status === "signed-out" ? <p style={body}>Inicia sesión para continuar.</p> : null}
        {phase.status === "forbidden" ? <p style={body}>Acceso restringido al personal.</p> : null}
        {phase.status === "loading" ? <p style={body}>Cargando…</p> : null}
        {phase.status === "error" ? <p style={{ ...body, color: "#B91C1C" }}>No pudimos cargar las solicitudes.</p> : null}

        {phase.status === "ready" ? (
          <>
            <p style={meta}>{phase.total} resultado{phase.total === 1 ? "" : "s"}</p>
            {wide ? (
              <div style={{ display: "grid" }}>
                <div style={tableHead}>
                  <span>Número</span>
                  <span>Producto</span>
                  <span>Cliente</span>
                  <span>Fecha</span>
                  <span>Cant.</span>
                  <span>Estado</span>
                </div>
                {phase.items.map((item) => (
                  <Link key={item.id} href={`/admin/solicitudes/${encodeURIComponent(item.id)}`} style={tableRow}>
                    <span style={{ fontWeight: 700 }}>{item.requestNumber}</span>
                    <span>{requestTitle(item)}</span>
                    <span>{customerLabel(item)}</span>
                    <span>{formatRequestDate(item.createdAt)}</span>
                    <span>{item.quantity}</span>
                    <span
                      style={{
                        ...badge,
                        background: `${requestStatusColor[item.status]}18`,
                        color: requestStatusColor[item.status],
                        justifySelf: "start",
                      }}
                    >
                      {requestStatusLabel[item.status]}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {phase.items.map((item) => (
                  <Link key={item.id} href={`/admin/solicitudes/${encodeURIComponent(item.id)}`} style={mobileCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ color: colors.deep }}>{requestTitle(item)}</strong>
                      <span style={{ ...badge, background: `${requestStatusColor[item.status]}18`, color: requestStatusColor[item.status] }}>
                        {requestStatusLabel[item.status]}
                      </span>
                    </div>
                    <span style={meta}>
                      {item.requestNumber} · {customerLabel(item)} · Cant. {item.quantity}
                    </span>
                    <span style={meta}>{formatRequestDate(item.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}

            {phase.total > 20 ? (
              <div style={{ display: "flex", gap: 8 }}>
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
          </>
        ) : null}
      </div>
    </PageFrame>
  );
}

function customerLabel(item: ProductRequestView): string {
  const name = [item.customer?.givenName, item.customer?.familyName].filter(Boolean).join(" ").trim();
  return name || item.customer?.email || item.customer?.phoneE164 || "—";
}

const root: CSSProperties = { display: "grid", gap: 14, width: "100%" };
const back: CSSProperties = { color: colors.primary, fontWeight: 700, textDecoration: "none" };
const title: CSSProperties = { color: colors.deep, fontSize: 24, fontWeight: 800, margin: 0 };
const body: CSSProperties = { color: colors.deep, margin: 0 };
const meta: CSSProperties = { color: colors.muted, fontSize: 13, margin: 0 };
const searchRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
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
const badge: CSSProperties = { borderRadius: 999, fontSize: 12, fontWeight: 700, padding: "4px 10px", whiteSpace: "nowrap" };
const mobileCard: CSSProperties = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  color: "inherit",
  display: "grid",
  gap: 4,
  padding: 12,
  textDecoration: "none",
};
const tableHead: CSSProperties = {
  background: "#F8FAFC",
  border: `1px solid ${colors.border}`,
  borderRadius: "12px 12px 0 0",
  color: colors.muted,
  display: "grid",
  fontSize: 12,
  fontWeight: 700,
  gap: 8,
  gridTemplateColumns: "1.1fr 1.6fr 1.3fr 1.2fr 0.5fr 1fr",
  padding: "10px 12px",
};
const tableRow: CSSProperties = {
  alignItems: "center",
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderTop: "none",
  color: colors.deep,
  display: "grid",
  gap: 8,
  gridTemplateColumns: "1.1fr 1.6fr 1.3fr 1.2fr 0.5fr 1fr",
  padding: "12px",
  textDecoration: "none",
};
