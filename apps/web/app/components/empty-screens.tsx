"use client";

import { useState } from "react";
import { PageFrame } from "./page-frame";
import {
  bodyStyle,
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  mutedStyle,
  secondaryButtonStyle,
  spaceTokens,
  titleStyle,
} from "./styles";

const timeline = [
  { id: "paid", label: "Pago confirmado", detail: "Cuando el pago quede verificado." },
  { id: "usa", label: "Compra en USA", detail: "Acto distinto al pago." },
  { id: "warehouse", label: "Recibido en almacén USA", detail: "Pendiente de logística." },
  { id: "transit", label: "En tránsito internacional", detail: "Estado de ejemplo del diseño." },
  { id: "ve", label: "En Venezuela", detail: "Entrega local coordinada." },
  { id: "done", label: "Entregado", detail: "Cierre del pedido." },
] as const;

export function OrdersScreen() {
  const [tab, setTab] = useState<"activos" | "historial">("activos");

  return (
    <PageFrame>
      <h1 style={titleStyle}>Mis pedidos</h1>
      <div style={{ display: "flex", gap: spaceTokens[2], marginBottom: spaceTokens[4] }}>
        <button
          type="button"
          style={tab === "activos" ? buttonStyle : secondaryButtonStyle}
          onClick={() => setTab("activos")}
          aria-pressed={tab === "activos"}
        >
          Activos
        </button>
        <button
          type="button"
          style={tab === "historial" ? buttonStyle : secondaryButtonStyle}
          onClick={() => setTab("historial")}
          aria-pressed={tab === "historial"}
        >
          Historial
        </button>
      </div>

      <article style={cardStyle}>
        <p style={{ ...headingStyle, margin: 0 }}>
          {tab === "activos" ? "No tienes pedidos activos." : "Todavía no hay historial."}
        </p>
        <p role="status" style={bodyStyle}>
          Cuando exista un pedido, aquí verás el estado y el seguimiento.
        </p>
      </article>

      <section aria-label="Seguimiento de ejemplo" style={{ ...cardStyle, marginTop: spaceTokens[4] }}>
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ ...headingStyle, margin: 0 }}>Seguimiento</h2>
          <span
            style={{
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: 999,
              color: colors.primary,
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 10px",
            }}
          >
            Sin pedido
          </span>
        </div>
        <p style={mutedStyle}>Estructura visual del diseño. No hay un envío real asociado.</p>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {timeline.map((step, index) => (
            <li
              key={step.id}
              style={{
                display: "grid",
                gap: 4,
                gridTemplateColumns: "20px 1fr",
                paddingBottom: index === timeline.length - 1 ? 0 : spaceTokens[4],
                position: "relative",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  background: colors.border,
                  borderRadius: "50%",
                  display: "inline-block",
                  height: 12,
                  marginTop: 4,
                  width: 12,
                }}
              />
              <div>
                <p style={{ ...headingStyle, margin: 0 }}>{step.label}</p>
                <p style={{ ...mutedStyle, margin: 0 }}>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </PageFrame>
  );
}
