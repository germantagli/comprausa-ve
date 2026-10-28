"use client";

import { ApiClientError, getAccountProfile, listFulfillmentQueue, recordTrackingEvent, type AccountProfile, type OperatorOrder } from "@comprausa/api-client";
import { fulfillmentLabel, formatUsdFromMinor, recordedAtLabel } from "@comprausa/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { readSession } from "../lib/session";
import { bodyStyle, buttonStyle, cardStyle, errorStyle, headingStyle, inputStyle, linkStyle, pageStyle, secondaryButtonStyle, titleStyle } from "./styles";

const operatorRoles = new Set(["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_AGENT", "PROCUREMENT_AGENT", "LOGISTICS_AGENT"]);

export function OperatorOrdersScreen() {
  const [phase, setPhase] = useState<"loading" | "signed-out" | "error" | "ready">("loading");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [items, setItems] = useState<OperatorOrder[] | "loading" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
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
    if (!session || !profile?.mfaSatisfied || !operatorRoles.has(profile.role)) {
      return;
    }
    let cancelled = false;
    setItems("loading");
    listFulfillmentQueue(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setItems(next.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile, attempt]);

  async function record(orderId: string, status: string): Promise<void> {
    const session = readSession();
    const note = notes[orderId]?.trim() ?? "";
    if (!session) {
      return;
    }
    if (!note) {
      setError("Escribe una nota.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await recordTrackingEvent(apiBase, session.accessToken, orderId, { status, note });
      setMessage("Movimiento registrado.");
      setAttempt((current) => current + 1);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 409 ? "Ese salto de estado no está permitido." : "No pudimos registrar el movimiento.");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Pedidos</h1>
        <p style={bodyStyle}>Cargando…</p>
      </main>
    );
  }
  if (phase === "signed-out") {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Pedidos</h1>
        <p style={bodyStyle}>
          Entra para ver la cola. <Link href="/entrar" style={linkStyle}>Entrar</Link>
        </p>
      </main>
    );
  }
  if (phase === "error" || !profile) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Pedidos</h1>
        <p role="alert" style={errorStyle}>No pudimos cargar la cola.</p>
        <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>Reintentar</button>
      </main>
    );
  }
  if (!operatorRoles.has(profile.role)) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Pedidos</h1>
        <p style={bodyStyle}>Esta pantalla es para el operador.</p>
      </main>
    );
  }
  if (!profile.mfaSatisfied) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Pedidos</h1>
        <p style={bodyStyle}>
          Confirma el segundo factor en la revisión de pagos. Sin eso la cola responde que no tienes permiso.
        </p>
        <Link href="/operador" style={linkStyle}>Ir a la revisión</Link>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Pedidos</h1>
      <p style={bodyStyle}>Registra el siguiente movimiento y una nota. La fecha es la del registro. No se promete una entrega.</p>
      {message ? <p role="status" style={headingStyle}>{message}</p> : null}
      {error ? <p role="alert" style={errorStyle}>{error}</p> : null}
      {items === "loading" ? <p style={bodyStyle}>Cargando…</p> : null}
      {items === "error" ? (
        <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>Reintentar</button>
      ) : null}
      {Array.isArray(items) && items.length === 0 ? <p style={bodyStyle}>No hay pedidos en la cola.</p> : null}
      {Array.isArray(items)
        ? items.map((order) => (
            <article key={order.id} style={cardStyle}>
              <h2 style={headingStyle}>{fulfillmentLabel(order.status)}</h2>
              <p style={bodyStyle}>{formatUsdFromMinor(order.grandTotalMinor)}</p>
              <p style={bodyStyle}>{order.purchasedFromStore ? "La compra en la tienda quedó registrada." : "Todavía no se compró en la tienda."}</p>
              <ol style={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
                {order.timeline.map((event) => (
                  <li key={event.id}>
                    <p style={bodyStyle}>{fulfillmentLabel(event.status)}. {event.note}</p>
                    <p style={bodyStyle}>Acción del operador. {recordedAtLabel(event.occurredAt)}</p>
                  </li>
                ))}
              </ol>
              {order.allowed.length > 0 ? (
                <label style={bodyStyle}>
                  Nota
                  <input
                    style={inputStyle}
                    value={notes[order.id] ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [order.id]: event.target.value }))}
                  />
                </label>
              ) : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {order.allowed.map((status) => (
                  <button
                    key={status}
                    type="button"
                    style={status === "CANCELLED" || status === "EXCEPTION" ? secondaryButtonStyle : buttonStyle}
                    disabled={busy}
                    onClick={() => void record(order.id, status)}
                  >
                    {fulfillmentLabel(status)}
                  </button>
                ))}
              </div>
            </article>
          ))
        : null}
    </main>
  );
}
