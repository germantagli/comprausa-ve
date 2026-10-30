"use client";

import {
  getAccountProfile,
  getProductRequestMetrics,
  listAdminProductRequests,
  type AccountProfile,
  type ProductRequestMetrics,
  type ProductRequestView,
} from "@comprausa/api-client";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { PageFrame } from "../../components/page-frame";
import { buttonStyle, colors, secondaryButtonStyle } from "../../components/styles";
import { apiBase } from "../../lib/api";
import {
  formatRequestDate,
  isStaffProfile,
  requestStatusColor,
  requestStatusLabel,
  requestTitle,
} from "../../lib/product-request-ui";
import { readSession } from "../../lib/session";

type Phase =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; profile: AccountProfile; metrics: ProductRequestMetrics; recent: ProductRequestView[] };

export default function AdminDashboardPage() {
  const [phase, setPhase] = useState<Phase>({ status: "loading" });

  useEffect(() => {
    const session = readSession();
    if (!session?.accessToken) {
      setPhase({ status: "signed-out" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await getAccountProfile(apiBase, session.accessToken);
        if (!isStaffProfile(profile)) {
          if (!cancelled) setPhase({ status: "forbidden" });
          return;
        }
        const [metrics, recent] = await Promise.all([
          getProductRequestMetrics(apiBase, session.accessToken),
          listAdminProductRequests(apiBase, session.accessToken, { page: 1, pageSize: 8 }),
        ]);
        if (!cancelled) setPhase({ status: "ready", profile, metrics, recent: recent.items });
      } catch {
        if (!cancelled) setPhase({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageFrame wide compact>
      <div style={root}>
        <Link href="/perfil" style={back}>
          ← Perfil
        </Link>
        <div style={headerRow}>
          <h1 style={title}>Administración</h1>
          <Link href="/admin/solicitudes" style={{ ...buttonStyle, textDecoration: "none" }}>
            Ver solicitudes
          </Link>
        </div>

        {phase.status === "loading" ? <p style={body}>Cargando…</p> : null}
        {phase.status === "signed-out" ? (
          <p style={body}>
            <Link href={`/entrar?modo=entrar&next=${encodeURIComponent("/admin")}`} style={back}>
              Inicia sesión
            </Link>{" "}
            para acceder.
          </p>
        ) : null}
        {phase.status === "forbidden" ? <p style={body}>Esta sección es solo para personal autorizado.</p> : null}
        {phase.status === "error" ? <p style={{ ...body, color: "#B91C1C" }}>No pudimos cargar el panel.</p> : null}

        {phase.status === "ready" ? (
          <>
            <div style={metricsGrid}>
              <Metric label="Total" value={phase.metrics.total} />
              <Metric label="Recibidas" value={phase.metrics.received} tone="#1B5FC7" />
              <Metric label="En revisión" value={phase.metrics.inReview} tone="#D97706" />
              <Metric label="Cotizadas" value={phase.metrics.quoted} tone="#15803D" />
              <Metric label="Aceptadas" value={phase.metrics.accepted} tone="#0F766E" />
              <Metric label="Rechazadas" value={phase.metrics.rejected} tone="#B91C1C" />
            </div>

            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={sectionTitle}>Solicitudes recientes</h2>
              {phase.recent.length === 0 ? <p style={body}>No hay solicitudes todavía.</p> : null}
              <div style={tableWrap}>
                {phase.recent.map((item) => (
                  <Link key={item.id} href={`/admin/solicitudes/${encodeURIComponent(item.id)}`} style={rowCard}>
                    <div>
                      <p style={cardTitle}>{requestTitle(item)}</p>
                      <p style={meta}>
                        {item.requestNumber} · {item.customer?.email ?? "Cliente"} · {formatRequestDate(item.createdAt)}
                      </p>
                    </div>
                    <span
                      style={{
                        ...badge,
                        background: `${requestStatusColor[item.status]}18`,
                        color: requestStatusColor[item.status],
                      }}
                    >
                      {requestStatusLabel[item.status]}
                    </span>
                  </Link>
                ))}
              </div>
              <Link href="/admin/solicitudes" style={{ ...secondaryButtonStyle, textAlign: "center", textDecoration: "none" }}>
                Ir a todas las solicitudes
              </Link>
            </section>
          </>
        ) : null}
      </div>
    </PageFrame>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div style={metricCard}>
      <p style={{ ...meta, margin: 0 }}>{label}</p>
      <p style={{ color: tone ?? colors.deep, fontSize: 28, fontWeight: 800, margin: 0 }}>{value}</p>
    </div>
  );
}

const root: CSSProperties = { display: "grid", gap: 16, width: "100%" };
const back: CSSProperties = { color: colors.primary, fontWeight: 700, textDecoration: "none" };
const title: CSSProperties = { color: colors.deep, fontSize: 26, fontWeight: 800, margin: 0 };
const body: CSSProperties = { color: colors.deep, margin: 0 };
const meta: CSSProperties = { color: colors.muted, fontSize: 13, margin: "4px 0 0" };
const sectionTitle: CSSProperties = { color: colors.deep, fontSize: 18, fontWeight: 800, margin: 0 };
const headerRow: CSSProperties = { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" };
const metricsGrid: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
};
const metricCard: CSSProperties = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  display: "grid",
  gap: 4,
  padding: 14,
};
const tableWrap: CSSProperties = { display: "grid", gap: 8 };
const rowCard: CSSProperties = {
  alignItems: "center",
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  color: "inherit",
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  padding: 12,
  textDecoration: "none",
};
const cardTitle: CSSProperties = { color: colors.deep, fontWeight: 700, margin: 0 };
const badge: CSSProperties = { borderRadius: 999, fontSize: 12, fontWeight: 700, padding: "4px 10px", whiteSpace: "nowrap" };
