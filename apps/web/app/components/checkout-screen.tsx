"use client";

import Link from "next/link";
import { useState } from "react";
import { checkoutSteps, paymentMethodLabels } from "../lib/demo-chrome";
import { PageFrame } from "./page-frame";
import {
  bodyStyle,
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  mutedStyle,
  spaceTokens,
  summaryBoxStyle,
  titleStyle,
} from "./styles";

export function CheckoutScreen() {
  const [method, setMethod] = useState<(typeof paymentMethodLabels)[number]["id"]>("pago-movil");
  const [step] = useState(2);

  return (
    <PageFrame wide>
      <h1 style={titleStyle}>Pago</h1>
      <p style={mutedStyle}>
        Maqueta de checkout. El importe real sale de una cotización publicada por el equipo. Aquí no se cobra nada.
      </p>

      <ol className="cve-stepper" aria-label="Pasos del pago">
        {checkoutSteps.map((label, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <li
              key={label}
              style={{
                alignItems: "center",
                background: active ? colors.primary : colors.surface,
                border: `1px solid ${active ? colors.primary : colors.border}`,
                borderRadius: 999,
                color: active ? colors.primaryOn : done ? colors.success : colors.muted,
                display: "inline-flex",
                fontSize: 13,
                fontWeight: 700,
                gap: 8,
                minHeight: 40,
                padding: `0 ${spaceTokens[3]}px`,
              }}
            >
              <span>{index + 1}</span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className="cve-checkout-layout">
        <section style={cardStyle} aria-label="Métodos de pago">
          <h2 style={headingStyle}>Elige un método</h2>
          <div style={{ display: "grid", gap: spaceTokens[3] }}>
            {paymentMethodLabels.map((item) => (
              <label
                key={item.id}
                style={{
                  alignItems: "flex-start",
                  background: method === item.id ? colors.background : colors.surface,
                  border: `1px solid ${method === item.id ? colors.primary : colors.border}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  display: "grid",
                  gap: 4,
                  gridTemplateColumns: "24px 1fr",
                  padding: spaceTokens[4],
                }}
              >
                <input
                  type="radio"
                  name="pago"
                  value={item.id}
                  checked={method === item.id}
                  onChange={() => setMethod(item.id)}
                  style={{ marginTop: 4 }}
                />
                <span>
                  <span style={{ display: "block", fontWeight: 700 }}>{item.label}</span>
                  <span style={mutedStyle}>{item.note}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <aside style={summaryBoxStyle} aria-label="Resumen">
          <h2 style={{ ...headingStyle, margin: 0 }}>Resumen del pedido</h2>
          <SummaryLine label="Subtotal" value="Por cotización" />
          <SummaryLine label="Envío en USA" value="Por cotización" />
          <SummaryLine label="Comisión del servicio" value="Por cotización" />
          <SummaryLine label="Envío a Venezuela" value="Por cotización" />
          <p style={{ ...headingStyle, margin: 0 }}>Total estimado</p>
          <p style={{ ...bodyStyle, fontWeight: 700, margin: 0 }}>Por cotización</p>
          <p style={mutedStyle}>Sin montos inventados. Primero pide la cotización desde el carrito.</p>
          <Link href="/carrito" style={{ ...buttonStyle, alignItems: "center", display: "inline-flex", justifyContent: "center", textDecoration: "none" }}>
            Ir al carrito
          </Link>
          <Link href="/pedidos" style={{ color: colors.primary, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
            Ver seguimiento de pedidos
          </Link>
        </aside>
      </div>
    </PageFrame>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={mutedStyle}>{label}</span>
      <span style={{ ...bodyStyle, margin: 0 }}>{value}</span>
    </div>
  );
}
