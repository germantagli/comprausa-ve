"use client";

import { getOrder, listOrders, type CustomerOrder } from "@comprausa/api-client";
import { fulfillmentLabel, formatUsdFromMinor, recordedAtLabel } from "@comprausa/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { readSession } from "../lib/session";
import { bodyStyle, buttonStyle, cardStyle, errorStyle, headingStyle, linkStyle, pageStyle, titleStyle } from "./styles";

export function OrdersScreen() {
  const [phase, setPhase] = useState<"loading" | "signed-out" | "error" | "ready">("loading");
  const [items, setItems] = useState<CustomerOrder[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setPhase("signed-out");
      return;
    }
    let cancelled = false;
    setPhase("loading");
    listOrders(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setItems(next.items);
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

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Pedidos</h1>
      {phase === "loading" ? <p style={bodyStyle}>Cargando…</p> : null}
      {phase === "signed-out" ? (
        <p style={bodyStyle}>
          Entra para ver tus pedidos. <Link href="/entrar" style={linkStyle}>Entrar</Link>
        </p>
      ) : null}
      {phase === "error" ? (
        <div>
          <p role="alert" style={errorStyle}>No pudimos cargar los pedidos.</p>
          <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>Reintentar</button>
        </div>
      ) : null}
      {phase === "ready" && items.length === 0 ? <p role="status" style={bodyStyle}>No tienes pedidos activos.</p> : null}
      {phase === "ready"
        ? items.map((order) => (
            <article key={order.id} style={cardStyle}>
              <h2 style={headingStyle}>{fulfillmentLabel(order.status)}</h2>
              <p style={bodyStyle}>{formatUsdFromMinor(order.grandTotalMinor)}</p>
              <p style={bodyStyle}>{purchaseCopy(order)}</p>
              <Link href={`/pedidos/${order.id}`} style={linkStyle}>Ver la línea de tiempo</Link>
            </article>
          ))
        : null}
    </main>
  );
}

export function OrderDetailScreen({ orderId }: { orderId: string }) {
  const [phase, setPhase] = useState<"loading" | "signed-out" | "error" | "ready">("loading");
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setPhase("signed-out");
      return;
    }
    let cancelled = false;
    setPhase("loading");
    getOrder(apiBase, session.accessToken, orderId)
      .then((next) => {
        if (!cancelled) {
          setOrder(next);
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
  }, [attempt, orderId]);

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Pedido</h1>
      {phase === "loading" ? <p style={bodyStyle}>Cargando…</p> : null}
      {phase === "signed-out" ? (
        <p style={bodyStyle}>
          Entra para ver el pedido. <Link href="/entrar" style={linkStyle}>Entrar</Link>
        </p>
      ) : null}
      {phase === "error" ? (
        <div>
          <p role="alert" style={errorStyle}>No pudimos cargar el pedido.</p>
          <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>Reintentar</button>
        </div>
      ) : null}
      {phase === "ready" && order ? (
        <div>
          <p role="status" style={headingStyle}>{fulfillmentLabel(order.status)}</p>
          <p style={bodyStyle}>{formatUsdFromMinor(order.grandTotalMinor)}</p>
          <p style={bodyStyle}>{purchaseCopy(order)}</p>
          <h2 style={headingStyle}>Línea de tiempo</h2>
          {order.timeline.length === 0 ? <p style={bodyStyle}>Sin movimientos de compra ni de envío.</p> : null}
          <ol style={{ display: "grid", gap: 12, margin: 0, padding: 0, listStyle: "none" }}>
            {order.timeline.map((event) => (
              <li key={event.id} style={cardStyle}>
                <h3 style={headingStyle}>{fulfillmentLabel(event.status)}</h3>
                <p style={bodyStyle}>{event.note}</p>
                <p style={bodyStyle}>{recordedAtLabel(event.occurredAt)}</p>
              </li>
            ))}
          </ol>
          <h2 style={headingStyle}>Avisos</h2>
          {order.notices.length === 0 ? <p style={bodyStyle}>No hay avisos.</p> : null}
          {order.notices.map((notice) => (
            <p key={notice.id} style={bodyStyle}>{notice.message} {recordedAtLabel(notice.createdAt)}</p>
          ))}
          <Link href="/pedidos" style={linkStyle}>Volver a pedidos</Link>
        </div>
      ) : null}
    </main>
  );
}

function purchaseCopy(order: CustomerOrder): string {
  if (order.purchasedFromStore) {
    return "La compra en la tienda quedó registrada. No hay una fecha de entrega.";
  }
  if (order.status === "PAID" || order.status === "PROCUREMENT_PENDING") {
    return "Todavía no se compró en la tienda.";
  }
  return "El seguimiento muestra solo lo que ya se registró.";
}
