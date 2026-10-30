"use client";

import { createQuote, type VenezuelaAddressInput } from "@comprausa/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageFrame } from "../../components/page-frame";
import { buttonStyle, colors, radiusTokens, spaceTokens } from "../../components/styles";
import { apiBase } from "../../lib/api";
import { readSession } from "../../lib/session";

/**
 * Product request — paste a USA URL for TraeLo to quote.
 * Uses existing POST /v1/quotes with pastedUrl (no scraping).
 */
export default function SolicitarPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const session = readSession();
    if (!session?.accessToken) {
      setError("Inicia sesión para enviar una solicitud de cotización.");
      return;
    }
    const trimmed = url.trim();
    if (!trimmed.startsWith("http")) {
      setError("Pega un enlace https del producto.");
      return;
    }
    const address: VenezuelaAddressInput = {
      state: state.trim() || "Distrito Capital",
      city: city.trim() || "Caracas",
      municipality: municipality.trim() || "Libertador",
      reference: reference.trim() || "Solicitud desde Home",
    };
    setBusy(true);
    try {
      const quote = await createQuote(apiBase, session.accessToken, { address, pastedUrl: trimmed });
      router.push(`/cotizacion/${encodeURIComponent(quote.id)}`);
    } catch {
      setError("No pudimos enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame compact>
      <div style={{ display: "grid", gap: spaceTokens[4], margin: "0 auto", maxWidth: 430 }}>
        <Link href="/" style={{ color: colors.primary, fontWeight: 700, textDecoration: "none" }}>
          ← Volver al inicio
        </Link>
        <h1 style={{ color: colors.deep, fontSize: 24, fontWeight: 800, margin: 0 }}>Solicitar producto</h1>
        <p style={{ color: colors.muted, margin: 0 }}>
          Envíanos el enlace y te preparamos una cotización. No hacemos scraping automático.
        </p>
        <form onSubmit={(event) => void submit(event)} style={{ display: "grid", gap: spaceTokens[3] }}>
          <Field label="Enlace del producto">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" style={field} />
          </Field>
          <Field label="Estado">
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Distrito Capital" style={field} />
          </Field>
          <Field label="Ciudad">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Caracas" style={field} />
          </Field>
          <Field label="Municipio">
            <input value={municipality} onChange={(e) => setMunicipality(e.target.value)} placeholder="Libertador" style={field} />
          </Field>
          <Field label="Referencia / notas">
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Opcional" style={field} />
          </Field>
          {error ? <p style={{ color: "#B91C1C", margin: 0 }}>{error}</p> : null}
          <button type="submit" disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Enviando…" : "Enviar solicitud"}
          </button>
        </form>
      </div>
    </PageFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: colors.deep, fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

const field = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  color: colors.deep,
  font: "inherit",
  minHeight: 48,
  padding: "10px 12px",
  width: "100%",
} as const;
