"use client";

import { getMyProductRequest, type ProductRequestView } from "@comprausa/api-client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { PageFrame } from "../../../../components/page-frame";
import { buttonStyle, colors, secondaryButtonStyle } from "../../../../components/styles";
import { apiBase } from "../../../../lib/api";
import { formatRequestDate, requestStatusColor, requestStatusLabel, requestTitle } from "../../../../lib/product-request-ui";
import { readSession } from "../../../../lib/session";

type Phase = { status: "loading" } | { status: "error" } | { status: "ready"; request: ProductRequestView };

export default function SolicitarConfirmacionPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [phase, setPhase] = useState<Phase>({ status: "loading" });

  useEffect(() => {
    const session = readSession();
    if (!session?.accessToken || !id) {
      setPhase({ status: "error" });
      return;
    }
    let cancelled = false;
    getMyProductRequest(apiBase, session.accessToken, id)
      .then((request) => {
        if (!cancelled) setPhase({ status: "ready", request });
      })
      .catch(() => {
        if (!cancelled) setPhase({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <PageFrame compact>
      <div style={root}>
        {phase.status === "loading" ? <p style={body}>Cargando confirmación…</p> : null}
        {phase.status === "error" ? (
          <div style={card}>
            <p style={{ ...body, color: "#B91C1C" }}>No encontramos esa solicitud.</p>
            <Link href="/solicitar" style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
              Volver a solicitar
            </Link>
          </div>
        ) : null}
        {phase.status === "ready" ? (
          <>
            <div style={successIcon} aria-hidden="true">
              ✓
            </div>
            <h1 style={title}>¡Solicitud recibida!</h1>
            <p style={subtitle}>Revisaremos tu producto y te prepararemos una cotización.</p>
            <div style={card}>
              <Row label="ID de solicitud" value={phase.request.requestNumber} />
              <Row label="Producto" value={requestTitle(phase.request)} />
              <Row label="Cantidad" value={String(phase.request.quantity)} />
              <Row label="Fecha" value={formatRequestDate(phase.request.createdAt)} />
              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
                <span style={label}>Estado</span>
                <span
                  style={{
                    ...badge,
                    background: `${requestStatusColor[phase.request.status]}18`,
                    color: requestStatusColor[phase.request.status],
                  }}
                >
                  {requestStatusLabel[phase.request.status]}
                </span>
              </div>
            </div>
            <Link href="/mis-cotizaciones" style={{ ...buttonStyle, alignItems: "center", display: "inline-flex", justifyContent: "center", textDecoration: "none", width: "100%" }}>
              Ver mis cotizaciones
            </Link>
            <Link
              href="/explorar"
              style={{
                ...secondaryButtonStyle,
                alignItems: "center",
                display: "inline-flex",
                justifyContent: "center",
                textDecoration: "none",
                width: "100%",
              }}
            >
              Seguir explorando
            </Link>
          </>
        ) : null}
      </div>
    </PageFrame>
  );
}

function Row({ label: text, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={label}>{text}</span>
      <strong style={{ color: colors.deep, fontWeight: 700 }}>{value}</strong>
    </div>
  );
}

const root: CSSProperties = { display: "grid", gap: 14, justifyItems: "center", margin: "0 auto", maxWidth: 430, textAlign: "center", width: "100%" };
const title: CSSProperties = { color: colors.deep, fontSize: 24, fontWeight: 800, margin: 0 };
const subtitle: CSSProperties = { color: colors.muted, fontSize: 14, lineHeight: 1.45, margin: 0 };
const body: CSSProperties = { color: colors.deep, margin: 0 };
const label: CSSProperties = { color: colors.muted, fontSize: 12 };
const card: CSSProperties = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  display: "grid",
  gap: 12,
  padding: 16,
  textAlign: "left",
  width: "100%",
};
const successIcon: CSSProperties = {
  alignItems: "center",
  border: "2px dashed #22C55E",
  borderRadius: "50%",
  color: "#15803D",
  display: "inline-flex",
  fontSize: 36,
  fontWeight: 800,
  height: 88,
  justifyContent: "center",
  width: 88,
};
const badge: CSSProperties = {
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  padding: "4px 10px",
};
