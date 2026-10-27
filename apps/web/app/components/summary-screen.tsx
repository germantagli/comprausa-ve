"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearCheckoutDraft,
  readCheckoutDraft,
  saveDemoOrder,
  type CheckoutDraft,
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

export function SummaryScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!readSession()) {
      setSignedOut(true);
      setReady(true);
      return;
    }
    setDraft(readCheckoutDraft());
    setReady(true);
  }, []);

  function confirm(): void {
    if (!draft?.paymentMethodId || !draft.address.state) {
      return;
    }
    setBusy(true);
    const id = `CUA-${Date.now().toString(36).toUpperCase()}`;
    saveDemoOrder({
      id,
      createdAt: new Date().toISOString(),
      address: draft.address,
      paymentMethodId: draft.paymentMethodId,
      statusLabel: "Seguimiento de demostración",
    });
    clearCheckoutDraft();
    router.push("/pedidos");
  }

  if (!ready) {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Resumen</h1>
        <p style={bodyStyle}>Cargando…</p>
      </PageFrame>
    );
  }

  if (signedOut) {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Resumen</h1>
        <div style={cardStyle}>
          <p style={bodyStyle}>Entra para ver el resumen.</p>
          <Link href="/entrar" style={linkStyle}>
            Entrar
          </Link>
        </div>
      </PageFrame>
    );
  }

  const methodLabel = methodName(draft?.paymentMethodId ?? null);
  const addressOk = Boolean(draft?.address.state && draft.address.city);
  const paymentOk = Boolean(draft?.paymentMethodId);

  return (
    <PageFrame>
      <h1 style={titleStyle}>Resumen del pedido</h1>
      <p style={mutedStyle}>Confirmación de maqueta. No se cobra ni se reserva inventario.</p>
      <CheckoutStepper steps={checkoutSteps} active={3} />

      <div className="cve-checkout-layout">
        <section style={cardStyle}>
          <h2 style={headingStyle}>Dirección</h2>
          {addressOk && draft ? (
            <p style={bodyStyle}>
              {draft.address.municipality}, {draft.address.city}, {draft.address.state}
              <br />
              {draft.address.reference}
            </p>
          ) : (
            <p style={bodyStyle}>
              Falta la dirección.{" "}
              <Link href="/direccion" style={linkStyle}>
                Completar
              </Link>
            </p>
          )}
          <h2 style={headingStyle}>Método de pago</h2>
          {paymentOk ? (
            <p style={bodyStyle}>{methodLabel}</p>
          ) : (
            <p style={bodyStyle}>
              Falta el método.{" "}
              <Link href="/pago" style={linkStyle}>
                Elegir
              </Link>
            </p>
          )}
          <h2 style={headingStyle}>Importes</h2>
          <p style={bodyStyle}>Subtotal: por cotización</p>
          <p style={bodyStyle}>Envío USA / comisión / Venezuela: por cotización</p>
          <p style={mutedStyle}>Sin montos inventados. El total real sale de una cotización del equipo.</p>
        </section>

        <aside style={summaryBoxStyle}>
          <h2 style={{ ...headingStyle, margin: 0 }}>Total estimado</h2>
          <p style={{ ...bodyStyle, fontWeight: 700, margin: 0 }}>Por cotización</p>
          <button
            type="button"
            style={buttonStyle}
            disabled={busy || !addressOk || !paymentOk}
            onClick={confirm}
          >
            {busy ? "Espera…" : "Confirmar (sin cobrar)"}
          </button>
          <p style={{ ...mutedStyle, marginTop: spaceTokens[3] }}>
            <Link href="/pago" style={{ color: colors.primary }}>
              Volver al pago
            </Link>
          </p>
        </aside>
      </div>
    </PageFrame>
  );
}

function methodName(id: PaymentMethodId | null): string {
  if (!id) {
    return "";
  }
  return paymentMethodLabels.find((item) => item.id === id)?.label ?? id;
}
