"use client";

import {
  acceptProductQuote,
  ApiClientError,
  getMyProductRequest,
  rejectProductQuote,
  type ProductRequestView,
} from "@comprausa/api-client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { PageFrame } from "../../../components/page-frame";
import { buttonStyle, colors, secondaryButtonStyle } from "../../../components/styles";
import { apiBase } from "../../../lib/api";
import {
  formatRequestDate,
  formatUsdCents,
  isQuoteActionable,
  requestStatusColor,
  requestStatusLabel,
  requestTitle,
} from "../../../lib/product-request-ui";
import { readSession } from "../../../lib/session";

type Phase = { status: "loading" } | { status: "error" } | { status: "ready"; request: ProductRequestView };

export default function MisCotizacionDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [phase, setPhase] = useState<Phase>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function reload(): Promise<void> {
    const session = readSession();
    if (!session?.accessToken || !id) {
      setPhase({ status: "error" });
      return;
    }
    const request = await getMyProductRequest(apiBase, session.accessToken, id);
    setPhase({ status: "ready", request });
  }

  useEffect(() => {
    let cancelled = false;
    setPhase({ status: "loading" });
    reload()
      .catch(() => {
        if (!cancelled) setPhase({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per id
  }, [id]);

  async function onAccept(): Promise<void> {
    const session = readSession();
    if (!session?.accessToken || phase.status !== "ready" || !phase.request.quote) return;
    const total = formatUsdCents(phase.request.quote.totalMinor);
    if (!window.confirm(`¿Aceptar la cotización por ${total}? Se creará un pedido pendiente de pago.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await acceptProductQuote(apiBase, session.accessToken, id);
      setMessage("Cotización aceptada. Pedido pendiente de pago.");
      await reload();
      if (result.orderId) {
        router.push(`/pedidos/${encodeURIComponent(result.orderId)}`);
      }
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        setMessage("Esta cotización ya fue procesada.");
        await reload().catch(() => undefined);
      } else {
        setError("No pudimos aceptar la cotización.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onReject(): Promise<void> {
    const session = readSession();
    if (!session?.accessToken) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await rejectProductQuote(apiBase, session.accessToken, id, rejectReason.trim() || undefined);
      setRejectOpen(false);
      setMessage("Cotización rechazada.");
      await reload();
    } catch {
      setError("No pudimos rechazar la cotización.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame compact>
      <div style={root}>
        <Link href="/mis-cotizaciones" style={back}>
          ← Mis cotizaciones
        </Link>
        {phase.status === "loading" ? <p style={body}>Cargando…</p> : null}
        {phase.status === "error" ? <p style={{ ...body, color: "#B91C1C" }}>No encontramos esta solicitud.</p> : null}
        {phase.status === "ready" ? (
          <>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={title}>{requestTitle(phase.request)}</h1>
                <p style={meta}>{phase.request.requestNumber}</p>
              </div>
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

            <section style={card}>
              <h2 style={sectionTitle}>Producto</h2>
              <SafeExternalLink href={phase.request.productUrl} />
              <Row label="Cantidad" value={String(phase.request.quantity)} />
              {phase.request.size ? <Row label="Talla" value={phase.request.size} /> : null}
              {phase.request.color ? <Row label="Color" value={phase.request.color} /> : null}
              {phase.request.additionalNotes ? <Row label="Comentarios" value={phase.request.additionalNotes} /> : null}
              <Row label="Fecha" value={formatRequestDate(phase.request.createdAt)} />
            </section>

            <section style={card}>
              <h2 style={sectionTitle}>Historial</h2>
              <ol style={timeline}>
                {(phase.request.history ?? []).map((entry) => (
                  <li key={entry.id} style={timelineItem}>
                    <strong style={{ color: requestStatusColor[entry.newStatus] }}>{requestStatusLabel[entry.newStatus]}</strong>
                    <span style={meta}>{formatRequestDate(entry.createdAt)}</span>
                    {entry.comment ? <span style={meta}>{entry.comment}</span> : null}
                  </li>
                ))}
              </ol>
            </section>

            {!phase.request.quote || phase.request.quote.status === "DRAFT" ? (
              <section style={card}>
                <p style={body}>Estamos revisando tu solicitud.</p>
              </section>
            ) : (
              <section style={card}>
                <h2 style={sectionTitle}>Cotización</h2>
                <MoneyRow label="Precio unitario" minor={phase.request.quote.productUnitPriceMinor} />
                <MoneyRow label="Subtotal" minor={phase.request.quote.productSubtotalMinor} />
                <MoneyRow label="Envío dentro de USA" minor={phase.request.quote.domesticShippingMinor} />
                <MoneyRow label="Envío a Venezuela" minor={phase.request.quote.internationalShippingMinor} />
                <MoneyRow label="Comisión TraeLo" minor={phase.request.quote.serviceFeeMinor} />
                {phase.request.quote.taxesMinor > 0 ? <MoneyRow label="Impuestos" minor={phase.request.quote.taxesMinor} /> : null}
                {phase.request.quote.additionalCostsMinor > 0 ? (
                  <MoneyRow label="Costos adicionales" minor={phase.request.quote.additionalCostsMinor} />
                ) : null}
                {phase.request.quote.discountMinor > 0 ? <MoneyRow label="Descuento" minor={-phase.request.quote.discountMinor} /> : null}
                <div style={{ borderTop: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", paddingTop: 10 }}>
                  <strong>Total ({phase.request.quote.currency})</strong>
                  <strong>{formatUsdCents(phase.request.quote.totalMinor)}</strong>
                </div>
                {phase.request.quote.estimatedDeliveryDays ? (
                  <Row label="Plazo estimado" value={`${phase.request.quote.estimatedDeliveryDays} días`} />
                ) : null}
                {phase.request.quote.validUntil ? (
                  <Row label="Válida hasta" value={formatRequestDate(phase.request.quote.validUntil)} />
                ) : null}
                {phase.request.quote.customerMessage ? (
                  <Row label="Mensaje" value={phase.request.quote.customerMessage} />
                ) : null}
                {phase.request.quote.orderId ? (
                  <Link href={`/pedidos/${encodeURIComponent(phase.request.quote.orderId)}`} style={back}>
                    Ver pedido pendiente de pago
                  </Link>
                ) : null}
              </section>
            )}

            {message ? <p style={{ ...body, color: "#15803D" }}>{message}</p> : null}
            {error ? <p style={{ ...body, color: "#B91C1C" }}>{error}</p> : null}

            {isQuoteActionable(phase.request.quote) ? (
              <div style={{ display: "grid", gap: 10 }}>
                <button type="button" disabled={busy} style={{ ...buttonStyle, width: "100%" }} onClick={() => void onAccept()}>
                  {busy ? "Procesando…" : "Aceptar cotización"}
                </button>
                {!rejectOpen ? (
                  <button type="button" disabled={busy} style={{ ...secondaryButtonStyle, width: "100%" }} onClick={() => setRejectOpen(true)}>
                    Rechazar cotización
                  </button>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Motivo (opcional)"
                      rows={3}
                      style={textarea}
                    />
                    <button type="button" disabled={busy} style={{ ...secondaryButtonStyle, width: "100%", color: "#B91C1C" }} onClick={() => void onReject()}>
                      Confirmar rechazo
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </PageFrame>
  );
}

function SafeExternalLink({ href }: { href: string }) {
  let hostname = href;
  try {
    hostname = new URL(href).hostname;
  } catch {
    /* keep raw */
  }
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span style={meta}>Enlace original</span>
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" style={{ color: colors.primary, fontWeight: 600, wordBreak: "break-all" }}>
        {hostname}
      </a>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={meta}>{label}</span>
      <span style={{ color: colors.deep }}>{value}</span>
    </div>
  );
}

function MoneyRow({ label, minor }: { label: string; minor: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={meta}>{label}</span>
      <span style={{ color: colors.deep, fontWeight: 600 }}>{formatUsdCents(Math.abs(minor))}</span>
    </div>
  );
}

const root: CSSProperties = { display: "grid", gap: 14, margin: "0 auto", maxWidth: 560, width: "100%" };
const back: CSSProperties = { color: colors.primary, fontWeight: 700, textDecoration: "none" };
const title: CSSProperties = { color: colors.deep, fontSize: 22, fontWeight: 800, margin: 0 };
const body: CSSProperties = { color: colors.deep, margin: 0 };
const meta: CSSProperties = { color: colors.muted, fontSize: 13, margin: 0 };
const sectionTitle: CSSProperties = { color: colors.deep, fontSize: 16, fontWeight: 800, margin: 0 };
const card: CSSProperties = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  display: "grid",
  gap: 10,
  padding: 14,
};
const badge: CSSProperties = { borderRadius: 999, fontSize: 12, fontWeight: 700, padding: "4px 10px", whiteSpace: "nowrap" };
const timeline: CSSProperties = { display: "grid", gap: 10, listStyle: "none", margin: 0, padding: 0 };
const timelineItem: CSSProperties = { display: "grid", gap: 2 };
const textarea: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  font: "inherit",
  minHeight: 80,
  padding: 12,
  resize: "vertical",
  width: "100%",
};
