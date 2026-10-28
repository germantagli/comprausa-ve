"use client";

import {
  ApiClientError,
  acceptQuote,
  createPayment,
  getPaymentMethods,
  submitProof,
  type PaymentMethods,
  type QuoteView,
} from "@comprausa/api-client";
import { formatUsdFromMinor } from "@comprausa/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { bodyStyle, buttonStyle, errorStyle, headingStyle, inputStyle, secondaryButtonStyle } from "./styles";

export function PaymentPanel({
  quote,
  token,
  onChanged,
}: {
  quote: QuoteView;
  token: string;
  onChanged: () => void;
}) {
  const [methods, setMethods] = useState<PaymentMethods | "loading" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"ZELLE" | "PAGO_MOVIL" | null>(null);
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(quote.order ? String(quote.order.grandTotalMinor) : "");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (quote.status !== "ACCEPTED") {
      return;
    }
    let cancelled = false;
    setMethods("loading");
    getPaymentMethods(apiBase, token)
      .then((next) => {
        if (!cancelled) {
          setMethods(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMethods("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [quote.status, token, attempt]);

  if (quote.status === "PENDING_VALIDATION") {
    return <p style={bodyStyle}>No puedes pagar esta cotización hasta que un operador publique el importe.</p>;
  }
  if (quote.status === "FINAL" && quote.snapshot) {
    return (
      <div>
        <p style={bodyStyle}>Importe publicado: {formatUsdFromMinor(quote.snapshot.knownMinor)}. Puedes aceptarla. No puedes marcarla como pagada.</p>
        {error ? <p role="alert" style={errorStyle}>{error}</p> : null}
        <button
          type="button"
          style={buttonStyle}
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(null);
            acceptQuote(apiBase, token, quote.id)
              .then(() => onChanged())
              .catch(() => setError("No pudimos aceptar la cotización."))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Espera…" : "Aceptar cotización"}
        </button>
      </div>
    );
  }
  if (quote.payment && (quote.payment.status === "PROOF_SUBMITTED" || quote.payment.status === "UNDER_REVIEW")) {
    return <p role="status" style={headingStyle}>Tu pago está en revisión.</p>;
  }
  if (quote.payment?.status === "VERIFIED" || quote.order?.status === "PAID" || quote.order?.purchasedFromStore) {
    if (quote.order?.purchasedFromStore) {
      return (
        <p style={bodyStyle}>
          Pago verificado. La compra en la tienda quedó registrada.{" "}
          {quote.orderId ? <Link href={`/pedidos/${quote.orderId}`}>Ver el pedido</Link> : null}
        </p>
      );
    }
    return <p style={bodyStyle}>Pago verificado. Todavía no se compró en la tienda.</p>;
  }
  if (quote.payment?.status === "REJECTED") {
    return (
      <div>
        <p role="alert" style={errorStyle}>Rechazado. {quote.payment.rejectionReason ?? "Sin motivo."}</p>
        {form()}
      </div>
    );
  }
  return form();

  function form() {
    if (methods === "loading") {
      return <p style={bodyStyle}>Cargando…</p>;
    }
    if (methods === "error") {
      return (
        <div>
          <p role="alert" style={errorStyle}>No pudimos cargar los métodos.</p>
          <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
            Reintentar
          </button>
        </div>
      );
    }
    return (
      <div>
        <h2 style={headingStyle}>Elige un método</h2>
        <p style={bodyStyle}>{methods.stripe.detail}</p>
        <button type="button" style={secondaryButtonStyle} disabled={!methods.stripe.configured || busy} onClick={() => void payStripe(methods)}>
          Stripe
        </button>
        <p style={bodyStyle}>{methods.paypal.detail}</p>
        <button type="button" style={secondaryButtonStyle} disabled={busy} onClick={() => void payPaypal()}>
          PayPal
        </button>
        <p style={bodyStyle}>{methods.zelle.detail}</p>
        <button type="button" style={secondaryButtonStyle} onClick={() => setMethod("ZELLE")}>
          Zelle
        </button>
        <p style={bodyStyle}>{methods.pagoMovil.detail}</p>
        <button type="button" style={secondaryButtonStyle} onClick={() => setMethod("PAGO_MOVIL")}>
          Pago Móvil
        </button>
        {method ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void payManual();
            }}
          >
            {method === "PAGO_MOVIL" ? (
              <>
                <label style={bodyStyle}>
                  Banco
                  <input style={inputStyle} value={bank} onChange={(event) => setBank(event.target.value)} required />
                </label>
                <label style={bodyStyle}>
                  Teléfono
                  <input style={inputStyle} value={phone} onChange={(event) => setPhone(event.target.value)} required />
                </label>
                <label style={bodyStyle}>
                  Importe en centavos
                  <input style={inputStyle} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} required />
                </label>
              </>
            ) : null}
            <label style={bodyStyle}>
              Referencia
              <input style={inputStyle} value={reference} onChange={(event) => setReference(event.target.value)} required />
            </label>
            <label style={bodyStyle}>
              Comprobante
              <input
                style={inputStyle}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                required
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button type="submit" style={buttonStyle} disabled={busy}>
              {busy ? "Espera…" : "Enviar comprobante"}
            </button>
          </form>
        ) : null}
        {error ? <p role="alert" style={errorStyle}>{error}</p> : null}
      </div>
    );
  }

  async function payStripe(current: PaymentMethods) {
    if (!current.stripe.configured) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createPayment(apiBase, token, quote.id, { method: "STRIPE", idempotencyKey: crypto.randomUUID() });
      onChanged();
    } catch {
      setError("No pudimos iniciar Stripe.");
    } finally {
      setBusy(false);
    }
  }

  async function payPaypal() {
    setBusy(true);
    setError(null);
    try {
      const result = await createPayment(apiBase, token, quote.id, { method: "PAYPAL" });
      setError(null);
      onChanged();
      if (result.detail) {
        setError(result.detail);
      }
    } catch {
      setError("No pudimos iniciar PayPal.");
    } finally {
      setBusy(false);
    }
  }

  async function payManual() {
    if (!method || !file) {
      setError("Elige el comprobante.");
      return;
    }
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type) || file.size > 2_000_000) {
      setError("El comprobante tiene que ser JPEG, PNG o PDF de hasta 2 MB.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dataBase64 = await readFile(file);
      const body =
        method === "ZELLE"
          ? { method: "ZELLE" as const, reference }
          : { method: "PAGO_MOVIL" as const, bank, phone, reference, amountMinor: Number(amount) };
      const created = quote.payment?.status === "PENDING" ? { payment: { id: quote.payment.id } } : await createPayment(apiBase, token, quote.id, body);
      await submitProof(apiBase, token, created.payment.id, {
        contentType: file.type as "image/jpeg" | "image/png" | "application/pdf",
        dataBase64,
      });
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 409 ? "Esa referencia ya está registrada." : "No pudimos enviar el comprobante.");
    } finally {
      setBusy(false);
    }
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== "string") {
        reject(new Error("file"));
        return;
      }
      resolve(value.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("file"));
    reader.readAsDataURL(file);
  });
}
