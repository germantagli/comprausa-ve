"use client";

import {
  ApiClientError,
  enrollTotp,
  getAccountProfile,
  verifyTotp,
  listProofQueue,
  publishQuoteAmount,
  rejectPayment,
  verifyPayment,
  type AccountProfile,
  type PaymentView,
} from "@comprausa/api-client";
import { formatUsdFromMinor } from "@comprausa/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { readSession, saveSession } from "../lib/session";
import { bodyStyle, buttonStyle, cardStyle, errorStyle, headingStyle, inputStyle, linkStyle, pageStyle, secondaryButtonStyle, titleStyle } from "./styles";

const reviewRoles = new Set(["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_AGENT"]);

export function OperatorScreen() {
  const [phase, setPhase] = useState<"loading" | "signed-out" | "error" | "ready">("loading");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [queue, setQueue] = useState<PaymentView[] | "loading" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [amount, setAmount] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setPhase("signed-out");
      return;
    }
    let cancelled = false;
    setPhase("loading");
    getAccountProfile(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setProfile(next);
          setPhase("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    const session = readSession();
    if (!session || !profile?.mfaSatisfied || !reviewRoles.has(profile.role)) {
      return;
    }
    let cancelled = false;
    setQueue("loading");
    listProofQueue(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setQueue(next.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQueue("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile, attempt]);

  if (phase === "loading") {
    return (
      <main style={pageStyle} aria-busy="true">
        <h1 style={titleStyle}>Revisión</h1>
        <p style={bodyStyle}>Cargando…</p>
      </main>
    );
  }
  if (phase === "signed-out") {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Revisión</h1>
        <p style={bodyStyle}>
          Entra para revisar pagos. <Link href="/entrar" style={linkStyle}>Entrar</Link>
        </p>
      </main>
    );
  }
  if (phase === "error" || !profile) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Revisión</h1>
        <p role="alert" style={errorStyle}>No pudimos cargar la revisión.</p>
        <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
          Reintentar
        </button>
      </main>
    );
  }
  if (!reviewRoles.has(profile.role)) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Revisión</h1>
        <p style={bodyStyle}>Esta pantalla es para finanzas.</p>
      </main>
    );
  }
  if (!profile.mfaSatisfied) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Segundo factor</h1>
        <p style={bodyStyle}>Confirma el segundo factor después del OTP. Sin eso la revisión responde que no tienes permiso.</p>
        {secret ? <p style={bodyStyle}>Clave de configuración: {secret}</p> : null}
        {error ? <p role="alert" style={errorStyle}>{error}</p> : null}
        <button
          type="button"
          style={secondaryButtonStyle}
          disabled={busy}
          onClick={() => {
            const session = readSession();
            if (!session) {
              return;
            }
            setBusy(true);
            setError(null);
            enrollTotp(apiBase, session.accessToken)
              .then((next) => setSecret(next.secret))
              .catch((caught: unknown) => setError(caught instanceof ApiClientError ? "No pudimos preparar el segundo factor." : "No pudimos preparar el segundo factor."))
              .finally(() => setBusy(false));
          }}
        >
          Preparar clave
        </button>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const session = readSession();
            if (!session) {
              return;
            }
            setBusy(true);
            setError(null);
            verifyTotp(apiBase, session.accessToken, code)
              .then((next) => {
                saveSession({ ...session, accessToken: next.accessToken, expiresInSeconds: next.expiresInSeconds });
                setSecret(null);
                setAttempt((current) => current + 1);
              })
              .catch(() => setError("El código no sirvió."))
              .finally(() => setBusy(false));
          }}
        >
          <label style={bodyStyle}>
            Código de 6 dígitos
            <input style={inputStyle} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required />
          </label>
          <button type="submit" style={buttonStyle} disabled={busy}>
            {busy ? "Espera…" : "Confirmar"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Revisión</h1>
      <p style={bodyStyle}>
        <Link href="/operador/pedidos" style={linkStyle}>Seguimiento de pedidos</Link>
      </p>
      <p style={bodyStyle}>Escribe el importe final en centavos. No hay una tarifa automática. Verificar un pago no compra el artículo en la tienda.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const session = readSession();
          if (!session) {
            return;
          }
          setBusy(true);
          setError(null);
          setMessage(null);
          publishQuoteAmount(apiBase, session.accessToken, quoteId.trim(), Number(amount))
            .then(() => setMessage("Importe publicado."))
            .catch(() => setError("No pudimos publicar el importe."))
            .finally(() => setBusy(false));
        }}
      >
        <label style={bodyStyle}>
          Identificador de la cotización
          <input style={inputStyle} value={quoteId} onChange={(event) => setQuoteId(event.target.value)} required />
        </label>
        <label style={bodyStyle}>
          Importe en centavos
          <input style={inputStyle} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        </label>
        <button type="submit" style={buttonStyle} disabled={busy}>
          {busy ? "Espera…" : "Publicar importe"}
        </button>
      </form>
      {message ? <p role="status" style={headingStyle}>{message}</p> : null}
      {error ? <p role="alert" style={errorStyle}>{error}</p> : null}
      <h2 style={headingStyle}>Comprobantes</h2>
      {queue === "loading" ? <p style={bodyStyle}>Cargando…</p> : null}
      {queue === "error" ? (
        <div>
          <p role="alert" style={errorStyle}>No pudimos cargar los comprobantes.</p>
          <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
            Reintentar
          </button>
        </div>
      ) : null}
      {Array.isArray(queue) && queue.length === 0 ? <p style={bodyStyle}>No hay comprobantes en revisión.</p> : null}
      {Array.isArray(queue)
        ? queue.map((payment) => (
            <article key={payment.id} style={cardStyle}>
              <h3 style={headingStyle}>{payment.method}</h3>
              <p style={bodyStyle}>{formatUsdFromMinor(payment.amountMinor)}</p>
              <p style={bodyStyle}>Referencia: {payment.reference ?? "Sin referencia."}</p>
              <p style={bodyStyle}>{payment.proof ? `Comprobante recibido (${payment.proof.contentType}).` : "Sin comprobante."}</p>
              <label style={bodyStyle}>
                Motivo
                <input
                  style={inputStyle}
                  value={reasons[payment.id] ?? ""}
                  onChange={(event) => setReasons((current) => ({ ...current, [payment.id]: event.target.value }))}
                />
              </label>
              <button type="button" style={buttonStyle} disabled={busy} onClick={() => void review(payment.id, "verify")}>
                Verificar pago
              </button>
              <button type="button" style={secondaryButtonStyle} disabled={busy} onClick={() => void review(payment.id, "reject")}>
                Rechazar
              </button>
            </article>
          ))
        : null}
    </main>
  );

  async function review(paymentId: string, action: "verify" | "reject") {
    const session = readSession();
    if (!session) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (action === "verify") {
        await verifyPayment(apiBase, session.accessToken, paymentId);
        setMessage("Pago verificado. El pedido quedó pagado y no se compró en la tienda.");
      } else {
        const reason = reasons[paymentId]?.trim() ?? "";
        if (!reason) {
          setError("Escribe el motivo del rechazo.");
          return;
        }
        await rejectPayment(apiBase, session.accessToken, paymentId, reason);
        setMessage("Comprobante rechazado.");
      }
      setAttempt((current) => current + 1);
    } catch {
      setError("No pudimos actualizar el pago.");
    } finally {
      setBusy(false);
    }
  }
}
