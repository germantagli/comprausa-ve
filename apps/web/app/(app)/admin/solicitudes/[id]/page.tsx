"use client";

import {
  ApiClientError,
  getAccountProfile,
  getAdminProductRequest,
  saveAdminProductQuote,
  updateAdminProductRequestStatus,
  type ProductQuoteView,
  type ProductRequestView,
} from "@comprausa/api-client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { PageFrame } from "../../../../components/page-frame";
import { buttonStyle, colors, inputStyle, secondaryButtonStyle } from "../../../../components/styles";
import { apiBase } from "../../../../lib/api";
import {
  dollarsInputToMinor,
  formatRequestDate,
  formatUsdCents,
  isStaffProfile,
  minorToDollarsInput,
  requestStatusColor,
  requestStatusLabel,
  requestTitle,
} from "../../../../lib/product-request-ui";
import { readSession } from "../../../../lib/session";

type Phase =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; request: ProductRequestView };

type QuoteForm = {
  productUnitPrice: string;
  domesticShipping: string;
  internationalShipping: string;
  serviceFee: string;
  taxes: string;
  additionalCosts: string;
  discount: string;
  estimatedDeliveryDays: string;
  validUntil: string;
  customerMessage: string;
  adminNotes: string;
};

const emptyForm: QuoteForm = {
  productUnitPrice: "",
  domesticShipping: "0.00",
  internationalShipping: "0.00",
  serviceFee: "0.00",
  taxes: "0.00",
  additionalCosts: "0.00",
  discount: "0.00",
  estimatedDeliveryDays: "14",
  validUntil: "",
  customerMessage: "",
  adminNotes: "",
};

export default function AdminSolicitudDetallePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [phase, setPhase] = useState<Phase>({ status: "loading" });
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload(): Promise<ProductRequestView | null> {
    const session = readSession();
    if (!session?.accessToken || !id) {
      setPhase({ status: "signed-out" });
      return null;
    }
    const profile = await getAccountProfile(apiBase, session.accessToken);
    if (!isStaffProfile(profile)) {
      setPhase({ status: "forbidden" });
      return null;
    }
    const request = await getAdminProductRequest(apiBase, session.accessToken, id);
    setPhase({ status: "ready", request });
    const draft = [...(request.quotes ?? [])].reverse().find((q) => q.status === "DRAFT" || q.status === "SENT");
    if (draft) {
      setForm(quoteToForm(draft));
    }
    return request;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const previewTotal = useMemo(() => {
    if (phase.status !== "ready") return null;
    const unit = dollarsInputToMinor(form.productUnitPrice);
    const domestic = dollarsInputToMinor(form.domesticShipping);
    const international = dollarsInputToMinor(form.internationalShipping);
    const fee = dollarsInputToMinor(form.serviceFee);
    const taxes = dollarsInputToMinor(form.taxes);
    const additional = dollarsInputToMinor(form.additionalCosts);
    const discount = dollarsInputToMinor(form.discount);
    if (
      unit === null ||
      domestic === null ||
      international === null ||
      fee === null ||
      taxes === null ||
      additional === null ||
      discount === null
    ) {
      return null;
    }
    return unit * phase.request.quantity + domestic + international + fee + taxes + additional - discount;
  }, [form, phase]);

  async function markInReview(): Promise<void> {
    const session = readSession();
    if (!session?.accessToken) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateAdminProductRequestStatus(apiBase, session.accessToken, id, { status: "IN_REVIEW" });
      setMessage("Marcada como en revisión.");
      await reload();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? "No se pudo actualizar el estado." : "No se pudo actualizar el estado.");
    } finally {
      setBusy(false);
    }
  }

  async function saveQuote(send: boolean): Promise<void> {
    const session = readSession();
    if (!session?.accessToken || phase.status !== "ready") return;
    const unit = dollarsInputToMinor(form.productUnitPrice);
    const domestic = dollarsInputToMinor(form.domesticShipping);
    const international = dollarsInputToMinor(form.internationalShipping);
    const fee = dollarsInputToMinor(form.serviceFee);
    const taxes = dollarsInputToMinor(form.taxes);
    const additional = dollarsInputToMinor(form.additionalCosts);
    const discount = dollarsInputToMinor(form.discount);
    if ([unit, domestic, international, fee, taxes, additional, discount].some((v) => v === null)) {
      setError("Revisa los importes (máximo 2 decimales).");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        productUnitPriceMinor: unit,
        domesticShippingMinor: domestic,
        internationalShippingMinor: international,
        serviceFeeMinor: fee,
        taxesMinor: taxes,
        additionalCostsMinor: additional,
        discountMinor: discount,
        send,
      };
      if (form.estimatedDeliveryDays.trim()) {
        body.estimatedDeliveryDays = Number(form.estimatedDeliveryDays);
      }
      if (form.validUntil.trim()) {
        body.validUntil = new Date(form.validUntil).toISOString();
      }
      if (form.customerMessage.trim()) body.customerMessage = form.customerMessage.trim();
      if (form.adminNotes.trim()) body.adminNotes = form.adminNotes.trim();
      await saveAdminProductQuote(apiBase, session.accessToken, id, body);
      setMessage(send ? "Cotización enviada al cliente." : "Borrador guardado.");
      await reload();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.status === 400
          ? "Datos inválidos o total negativo."
          : "No pudimos guardar la cotización.",
      );
    } finally {
      setBusy(false);
    }
  }

  function onSubmitDraft(event: FormEvent): void {
    event.preventDefault();
    void saveQuote(false);
  }

  return (
    <PageFrame wide compact>
      <div style={root}>
        <Link href="/admin/solicitudes" style={back}>
          ← Solicitudes
        </Link>
        {phase.status === "loading" ? <p style={body}>Cargando…</p> : null}
        {phase.status === "signed-out" ? <p style={body}>Inicia sesión.</p> : null}
        {phase.status === "forbidden" ? <p style={body}>Acceso restringido.</p> : null}
        {phase.status === "error" ? <p style={{ ...body, color: "#B91C1C" }}>No encontramos la solicitud.</p> : null}

        {phase.status === "ready" ? (
          <>
            <div style={headerRow}>
              <div>
                <h1 style={title}>{phase.request.requestNumber}</h1>
                <p style={meta}>{requestTitle(phase.request)}</p>
              </div>
              <span style={{ ...badge, background: `${requestStatusColor[phase.request.status]}18`, color: requestStatusColor[phase.request.status] }}>
                {requestStatusLabel[phase.request.status]}
              </span>
            </div>

            <div style={layout}>
              <section style={card}>
                <h2 style={sectionTitle}>Cliente</h2>
                <Row label="Nombre" value={customerName(phase.request)} />
                <Row label="Correo" value={phase.request.customer?.email ?? "—"} />
                <Row label="Teléfono" value={phase.request.customer?.phoneE164 ?? "—"} />
              </section>

              <section style={card}>
                <h2 style={sectionTitle}>Producto</h2>
                <SafeLink href={phase.request.productUrl} />
                <Row label="Cantidad" value={String(phase.request.quantity)} />
                {phase.request.size ? <Row label="Talla" value={phase.request.size} /> : null}
                {phase.request.color ? <Row label="Color" value={phase.request.color} /> : null}
                {phase.request.additionalNotes ? <Row label="Comentarios" value={phase.request.additionalNotes} /> : null}
                <Row label="Fecha" value={formatRequestDate(phase.request.createdAt)} />
                {phase.request.status === "RECEIVED" ? (
                  <button type="button" disabled={busy} style={buttonStyle} onClick={() => void markInReview()}>
                    Marcar en revisión
                  </button>
                ) : null}
              </section>
            </div>

            <section style={card}>
              <h2 style={sectionTitle}>Historial</h2>
              <ol style={{ display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
                {(phase.request.history ?? []).map((entry) => (
                  <li key={entry.id} style={{ display: "grid", gap: 2 }}>
                    <strong style={{ color: requestStatusColor[entry.newStatus] }}>{requestStatusLabel[entry.newStatus]}</strong>
                    <span style={meta}>{formatRequestDate(entry.createdAt)}</span>
                    {entry.comment ? <span style={meta}>{entry.comment}</span> : null}
                  </li>
                ))}
              </ol>
            </section>

            {(phase.request.quotes ?? []).length > 0 ? (
              <section style={card}>
                <h2 style={sectionTitle}>Versiones de cotización</h2>
                {(phase.request.quotes ?? []).map((quote) => (
                  <div key={quote.id} style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 8 }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>
                      v{quote.version} · {quote.status} · {formatUsdCents(quote.totalMinor)}
                    </p>
                    <p style={meta}>{formatRequestDate(quote.updatedAt)}</p>
                  </div>
                ))}
              </section>
            ) : null}

            {phase.request.status !== "ACCEPTED" && phase.request.status !== "CANCELLED" ? (
              <form style={card} onSubmit={onSubmitDraft}>
                <h2 style={sectionTitle}>Generar cotización (USD)</h2>
                <p style={meta}>Cantidad fija de la solicitud: {phase.request.quantity}. El total lo calcula el servidor.</p>
                <MoneyField label="Precio unitario *" value={form.productUnitPrice} onChange={(v) => setForm((f) => ({ ...f, productUnitPrice: v }))} />
                <MoneyField label="Envío dentro de USA" value={form.domesticShipping} onChange={(v) => setForm((f) => ({ ...f, domesticShipping: v }))} />
                <MoneyField label="Envío a Venezuela" value={form.internationalShipping} onChange={(v) => setForm((f) => ({ ...f, internationalShipping: v }))} />
                <MoneyField label="Comisión TraeLo" value={form.serviceFee} onChange={(v) => setForm((f) => ({ ...f, serviceFee: v }))} />
                <MoneyField label="Impuestos" value={form.taxes} onChange={(v) => setForm((f) => ({ ...f, taxes: v }))} />
                <MoneyField label="Costos adicionales" value={form.additionalCosts} onChange={(v) => setForm((f) => ({ ...f, additionalCosts: v }))} />
                <MoneyField label="Descuento" value={form.discount} onChange={(v) => setForm((f) => ({ ...f, discount: v }))} />
                <label style={fieldLabel}>
                  Días estimados de entrega
                  <input
                    value={form.estimatedDeliveryDays}
                    onChange={(event) => setForm((f) => ({ ...f, estimatedDeliveryDays: event.target.value }))}
                    style={inputStyle}
                    inputMode="numeric"
                  />
                </label>
                <label style={fieldLabel}>
                  Válida hasta
                  <input
                    type="datetime-local"
                    value={form.validUntil}
                    onChange={(event) => setForm((f) => ({ ...f, validUntil: event.target.value }))}
                    style={inputStyle}
                  />
                </label>
                <label style={fieldLabel}>
                  Comentarios para el cliente
                  <textarea
                    value={form.customerMessage}
                    onChange={(event) => setForm((f) => ({ ...f, customerMessage: event.target.value }))}
                    rows={3}
                    style={{ ...inputStyle, minHeight: 80, paddingTop: 10, resize: "vertical" }}
                  />
                </label>
                <label style={fieldLabel}>
                  Notas internas
                  <textarea
                    value={form.adminNotes}
                    onChange={(event) => setForm((f) => ({ ...f, adminNotes: event.target.value }))}
                    rows={2}
                    style={{ ...inputStyle, minHeight: 64, paddingTop: 10, resize: "vertical" }}
                  />
                </label>
                <p style={{ ...body, fontWeight: 700 }}>
                  Total estimado (cliente): {previewTotal === null ? "—" : formatUsdCents(Math.max(0, previewTotal))}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="submit" disabled={busy} style={secondaryButtonStyle}>
                    {busy ? "Guardando…" : "Guardar borrador"}
                  </button>
                  <button type="button" disabled={busy} style={buttonStyle} onClick={() => void saveQuote(true)}>
                    {busy ? "Enviando…" : "Enviar cotización"}
                  </button>
                </div>
              </form>
            ) : null}

            {message ? <p style={{ ...body, color: "#15803D" }}>{message}</p> : null}
            {error ? <p style={{ ...body, color: "#B91C1C" }}>{error}</p> : null}
          </>
        ) : null}
      </div>
    </PageFrame>
  );
}

function quoteToForm(quote: ProductQuoteView): QuoteForm {
  return {
    productUnitPrice: minorToDollarsInput(quote.productUnitPriceMinor),
    domesticShipping: minorToDollarsInput(quote.domesticShippingMinor),
    internationalShipping: minorToDollarsInput(quote.internationalShippingMinor),
    serviceFee: minorToDollarsInput(quote.serviceFeeMinor),
    taxes: minorToDollarsInput(quote.taxesMinor),
    additionalCosts: minorToDollarsInput(quote.additionalCostsMinor),
    discount: minorToDollarsInput(quote.discountMinor),
    estimatedDeliveryDays: quote.estimatedDeliveryDays ? String(quote.estimatedDeliveryDays) : "",
    validUntil: quote.validUntil ? toLocalInput(quote.validUntil) : "",
    customerMessage: quote.customerMessage ?? "",
    adminNotes: quote.adminNotes ?? "",
  };
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function customerName(request: ProductRequestView): string {
  const name = [request.customer?.givenName, request.customer?.familyName].filter(Boolean).join(" ").trim();
  return name || "—";
}

function SafeLink({ href }: { href: string }) {
  let label = href;
  try {
    label = new URL(href).hostname;
  } catch {
    /* keep */
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" style={{ color: colors.primary, fontWeight: 600, wordBreak: "break-all" }}>
      {label}
    </a>
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

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={fieldLabel}>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" style={inputStyle} placeholder="0.00" />
    </label>
  );
}

const root: CSSProperties = { display: "grid", gap: 14, width: "100%" };
const back: CSSProperties = { color: colors.primary, fontWeight: 700, textDecoration: "none" };
const title: CSSProperties = { color: colors.deep, fontSize: 24, fontWeight: 800, margin: 0 };
const body: CSSProperties = { color: colors.deep, margin: 0 };
const meta: CSSProperties = { color: colors.muted, fontSize: 13, margin: 0 };
const sectionTitle: CSSProperties = { color: colors.deep, fontSize: 16, fontWeight: 800, margin: 0 };
const headerRow: CSSProperties = { alignItems: "flex-start", display: "flex", gap: 12, justifyContent: "space-between" };
const layout: CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" };
const card: CSSProperties = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  display: "grid",
  gap: 10,
  padding: 14,
};
const badge: CSSProperties = { borderRadius: 999, fontSize: 12, fontWeight: 700, padding: "4px 10px", whiteSpace: "nowrap" };
const fieldLabel: CSSProperties = { display: "grid", gap: 6, color: colors.deep, fontSize: 14, fontWeight: 700 };
