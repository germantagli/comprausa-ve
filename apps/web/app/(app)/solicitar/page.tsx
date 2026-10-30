"use client";

import { ApiClientError, createProductRequest } from "@comprausa/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { PageFrame } from "../../components/page-frame";
import { buttonStyle, colors, radiusTokens } from "../../components/styles";
import { apiBase } from "../../lib/api";
import {
  clearProductRequestDraft,
  readProductRequestDraft,
  writeProductRequestDraft,
  type ProductRequestDraft,
} from "../../lib/product-request-ui";
import { readSession } from "../../lib/session";

const emptyDraft: ProductRequestDraft = {
  productUrl: "",
  productName: "",
  description: "",
  quantity: 1,
  size: "",
  color: "",
  additionalNotes: "",
};

/**
 * Real product-request form. Persists to POST /v1/product-requests.
 * Draft is kept in localStorage across login redirects. No scraping of the URL.
 */
export default function SolicitarPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductRequestDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    const saved = readProductRequestDraft();
    if (saved) {
      setDraft(saved);
    }
  }, []);

  function update<K extends keyof ProductRequestDraft>(key: K, value: ProductRequestDraft[K]): void {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      writeProductRequestDraft(next);
      return next;
    });
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setFieldError(null);
    const session = readSession();
    if (!session?.accessToken) {
      writeProductRequestDraft(draft);
      router.push(`/entrar?modo=entrar&next=${encodeURIComponent("/solicitar")}`);
      return;
    }
    const url = draft.productUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setFieldError("Por favor ingresa una URL válida (http o https).");
      return;
    }
    if (!Number.isInteger(draft.quantity) || draft.quantity < 1) {
      setError("La cantidad debe ser un entero mayor o igual a 1.");
      return;
    }
    setBusy(true);
    try {
      const created = await createProductRequest(apiBase, session.accessToken, {
        productUrl: url,
        quantity: draft.quantity,
        ...(draft.productName.trim() ? { productName: draft.productName.trim() } : {}),
        ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
        ...(draft.size.trim() ? { size: draft.size.trim() } : {}),
        ...(draft.color.trim() ? { color: draft.color.trim() } : {}),
        ...(draft.additionalNotes.trim() ? { additionalNotes: draft.additionalNotes.trim() } : {}),
      });
      clearProductRequestDraft();
      router.push(`/solicitar/confirmacion/${encodeURIComponent(created.id)}`);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.status === 401
          ? "Inicia sesión para enviar la solicitud."
          : "No pudimos guardar la solicitud. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame compact>
      <div style={root}>
        <Link href="/" style={back}>
          ← Volver
        </Link>
        <div style={hero}>
          <div style={heroIcon} aria-hidden="true">
            📦🔗
          </div>
          <h1 style={title}>¿No encuentras lo que buscas?</h1>
          <p style={subtitle}>Pega el enlace del producto que deseas y te prepararemos una cotización.</p>
        </div>

        <form onSubmit={(event) => void submit(event)} style={form}>
          <Field label="Enlace del producto *" error={fieldError}>
            <input
              value={draft.productUrl}
              onChange={(event) => {
                setFieldError(null);
                update("productUrl", event.target.value);
              }}
              placeholder="https://…"
              inputMode="url"
              autoComplete="url"
              style={{ ...field, ...(fieldError ? fieldInvalid : null) }}
            />
          </Field>
          <Field label="Nombre o descripción (opcional)">
            <input
              value={draft.productName}
              onChange={(event) => update("productName", event.target.value)}
              placeholder="Ej. Zapatillas Nike Air Max"
              style={field}
            />
          </Field>
          <Field label="Cantidad *">
            <div style={qtyRow}>
              <button type="button" style={qtyBtn} onClick={() => update("quantity", Math.max(1, draft.quantity - 1))} aria-label="Disminuir">
                −
              </button>
              <input
                type="number"
                min={1}
                max={50}
                value={draft.quantity}
                onChange={(event) => update("quantity", Math.max(1, Number(event.target.value) || 1))}
                style={{ ...field, textAlign: "center", width: 72 }}
              />
              <button type="button" style={qtyBtn} onClick={() => update("quantity", Math.min(50, draft.quantity + 1))} aria-label="Aumentar">
                +
              </button>
            </div>
          </Field>
          <Field label="Talla (opcional)">
            <input value={draft.size} onChange={(event) => update("size", event.target.value)} placeholder="Ej. 42 / M" style={field} />
          </Field>
          <Field label="Color (opcional)">
            <input value={draft.color} onChange={(event) => update("color", event.target.value)} placeholder="Ej. Negro" style={field} />
          </Field>
          <Field label="Comentarios adicionales (opcional)">
            <textarea
              value={draft.additionalNotes}
              onChange={(event) => update("additionalNotes", event.target.value)}
              placeholder="Detalles útiles para cotizar"
              rows={3}
              style={{ ...field, minHeight: 88, paddingTop: 12, resize: "vertical" }}
            />
          </Field>
          {error ? <p style={errorText}>{error}</p> : null}
          <button type="submit" disabled={busy} style={{ ...buttonStyle, width: "100%", opacity: busy ? 0.7 : 1 }}>
            {busy ? "Enviando…" : "✈ Solicitar cotización"}
          </button>
          <p style={note}>No descargamos ni hacemos scraping del enlace. Solo lo guardamos como texto para revisión humana.</p>
        </form>
      </div>
    </PageFrame>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string | null }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: colors.deep, fontWeight: 700, fontSize: 14 }}>{label}</span>
      {children}
      {error ? <span style={{ color: "#B91C1C", fontSize: 12 }}>{error}</span> : null}
    </label>
  );
}

const root: CSSProperties = { display: "grid", gap: 16, margin: "0 auto", maxWidth: 430, width: "100%" };
const back: CSSProperties = { color: colors.primary, fontWeight: 700, textDecoration: "none" };
const hero: CSSProperties = {
  background: "linear-gradient(180deg, #EAF3FF 0%, #FFFFFF 100%)",
  border: "1px solid #E4EAF1",
  borderRadius: 16,
  display: "grid",
  gap: 8,
  justifyItems: "center",
  padding: "20px 16px",
  textAlign: "center",
};
const heroIcon: CSSProperties = { fontSize: 28 };
const title: CSSProperties = { color: colors.deep, fontSize: 22, fontWeight: 800, margin: 0 };
const subtitle: CSSProperties = { color: colors.muted, fontSize: 14, lineHeight: 1.4, margin: 0 };
const form: CSSProperties = { display: "grid", gap: 14 };
const field: CSSProperties = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  color: colors.deep,
  font: "inherit",
  minHeight: 48,
  padding: "10px 12px",
  width: "100%",
};
const fieldInvalid: CSSProperties = { borderColor: "#DC2626", background: "#FEF2F2" };
const qtyRow: CSSProperties = { alignItems: "center", display: "flex", gap: 8 };
const qtyBtn: CSSProperties = {
  alignItems: "center",
  background: "#F1F4F8",
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  color: colors.deep,
  cursor: "pointer",
  display: "inline-flex",
  font: "inherit",
  fontWeight: 700,
  height: 44,
  justifyContent: "center",
  width: 44,
};
const errorText: CSSProperties = { color: "#B91C1C", margin: 0 };
const note: CSSProperties = { color: colors.muted, fontSize: 12, margin: 0 };
