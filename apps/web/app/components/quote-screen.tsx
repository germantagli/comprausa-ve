"use client";

import { ApiClientError, getQuote, type QuoteView } from "@comprausa/api-client";
import { formatUsdFromMinor, subtotalLabel } from "@comprausa/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { readSession } from "../lib/session";
import { bodyStyle, buttonStyle, cardStyle, errorStyle, headingStyle, linkStyle, pageStyle, titleStyle } from "./styles";

export function QuoteScreen({ quoteId }: { quoteId: string }) {
  const [phase, setPhase] = useState<"loading" | "signed-out" | "error" | "ready">("loading");
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setPhase("signed-out");
      return;
    }
    let cancelled = false;
    setPhase("loading");
    getQuote(apiBase, session.accessToken, quoteId)
      .then((next) => {
        if (!cancelled) {
          setQuote(next);
          setPhase("ready");
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setPhase(caught instanceof ApiClientError && caught.status === 404 ? "error" : "error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [quoteId, attempt]);

  if (phase === "loading") {
    return (
      <main style={pageStyle} aria-busy="true">
        <h1 style={titleStyle}>Cotización</h1>
        <p style={bodyStyle}>Cargando…</p>
      </main>
    );
  }
  if (phase === "signed-out") {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Cotización</h1>
        <p style={bodyStyle}>
          Entra para ver la cotización. <Link href="/entrar" style={linkStyle}>Entrar</Link>
        </p>
      </main>
    );
  }
  if (phase === "error" || !quote) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Cotización</h1>
        <p role="alert" style={errorStyle}>
          No pudimos cargar la cotización.
        </p>
        <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
          Reintentar
        </button>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Cotización</h1>
      <p role="status" style={headingStyle}>
        {quote.status === "PENDING_VALIDATION" ? "Pendiente de validación" : "Final"}
      </p>
      <p style={bodyStyle}>Esta cotización no se puede marcar como pagada ni como final desde aquí.</p>
      <p style={bodyStyle}>
        {quote.address.state}, {quote.address.city}, {quote.address.municipality}. {quote.address.reference}
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {quote.lines.map((line, index) => (
          <li key={`${line.productId ?? "enlace"}-${index}`} style={cardStyle}>
            <h2 style={headingStyle}>{line.description}</h2>
            {line.sourceUrl ? <p style={bodyStyle}>{line.sourceUrl}</p> : null}
            <p style={bodyStyle}>Cantidad: {line.quantity}</p>
            <p style={bodyStyle}>{line.unitAmountMinor === null ? "Precio por cotización" : formatUsdFromMinor(line.unitAmountMinor)}</p>
            <p style={bodyStyle}>{line.storeName ?? "Sin tienda."}</p>
          </li>
        ))}
      </ul>
      <p style={headingStyle}>{subtotalLabel(quote.subtotal)}</p>
      {quote.snapshot ? <p style={bodyStyle}>Instantánea final: {formatUsdFromMinor(quote.snapshot.knownMinor)}</p> : null}
      <p style={bodyStyle}>
        <Link href="/carrito" style={linkStyle}>
          Volver al carrito
        </Link>
      </p>
    </main>
  );
}
