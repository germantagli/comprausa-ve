"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  readCheckoutDraft,
  saveCheckoutDraft,
  type PaymentMethodId,
} from "../lib/checkout-draft";
import { checkoutSteps, paymentMethodLabels } from "../lib/demo-chrome";
import { readSession } from "../lib/session";
import { CheckoutStepper } from "./checkout-stepper";
import { PageFrame } from "./page-frame";
import {
  bodyStyle,
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  linkStyle,
  mutedStyle,
  spaceTokens,
  summaryBoxStyle,
  titleStyle,
} from "./styles";

export function CheckoutScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethodId>("pago-movil");
  const [ready, setReady] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [hasAddress, setHasAddress] = useState(false);

  useEffect(() => {
    if (!readSession()) {
      setSignedOut(true);
      setReady(true);
      return;
    }
    const draft = readCheckoutDraft();
    setHasAddress(Boolean(draft.address.state && draft.address.city));
    if (draft.paymentMethodId) {
      setMethod(draft.paymentMethodId);
    }
    setReady(true);
  }, []);

  function continueToSummary(): void {
    const draft = readCheckoutDraft();
    saveCheckoutDraft({ ...draft, paymentMethodId: method });
    router.push("/resumen");
  }

  if (!ready) {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Pago</h1>
        <p style={bodyStyle}>Cargando…</p>
      </PageFrame>
    );
  }

  if (signedOut) {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Pago</h1>
        <div style={cardStyle}>
          <p style={bodyStyle}>Entra para elegir un método de pago.</p>
          <Link href="/entrar" style={linkStyle}>
            Entrar
          </Link>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame wide>
      <h1 style={titleStyle}>Pago</h1>
      <p style={mutedStyle}>
        Maqueta de checkout. Aquí no se cobra nada. El importe real sale de una cotización publicada por el equipo.
      </p>
      <CheckoutStepper steps={checkoutSteps} active={2} />

      {!hasAddress ? (
        <p role="status" style={bodyStyle}>
          Todavía no hay dirección.{" "}
          <Link href="/direccion" style={linkStyle}>
            Agregar dirección
          </Link>
        </p>
      ) : null}

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
          <p style={mutedStyle}>Sin montos inventados. No se captura pago en este paso.</p>
          <button type="button" style={buttonStyle} onClick={continueToSummary}>
            Ir al resumen →
          </button>
          <Link href="/direccion" style={{ color: colors.primary, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
            Volver a la dirección
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
