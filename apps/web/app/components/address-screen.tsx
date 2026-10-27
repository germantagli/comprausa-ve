"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { checkoutSteps } from "../lib/demo-chrome";
import { readCheckoutDraft, saveCheckoutDraft, type CheckoutAddress } from "../lib/checkout-draft";
import { readSession } from "../lib/session";
import { CheckoutStepper } from "./checkout-stepper";
import { PageFrame } from "./page-frame";
import {
  bodyStyle,
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  inputStyle,
  linkStyle,
  mutedStyle,
  spaceTokens,
  titleStyle,
} from "./styles";

const empty: CheckoutAddress = { state: "", city: "", municipality: "", reference: "" };

export function AddressScreen() {
  const router = useRouter();
  const [address, setAddress] = useState<CheckoutAddress>(empty);
  const [ready, setReady] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (!readSession()) {
      setSignedOut(true);
      setReady(true);
      return;
    }
    setAddress(readCheckoutDraft().address);
    setReady(true);
  }, []);

  function onSubmit(event: FormEvent): void {
    event.preventDefault();
    const draft = readCheckoutDraft();
    saveCheckoutDraft({ ...draft, address });
    router.push("/pago");
  }

  if (!ready) {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Dirección</h1>
        <p style={bodyStyle}>Cargando…</p>
      </PageFrame>
    );
  }

  if (signedOut) {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Dirección</h1>
        <div style={cardStyle}>
          <p style={bodyStyle}>Entra para continuar el pedido.</p>
          <Link href="/entrar" style={linkStyle}>
            Entrar
          </Link>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <h1 style={titleStyle}>Dirección en Venezuela</h1>
      <p style={mutedStyle}>Paso de maqueta. Guardamos el borrador solo en este navegador; no hay cobro.</p>
      <CheckoutStepper steps={checkoutSteps} active={0} />
      <form onSubmit={onSubmit} style={cardStyle}>
        <h2 style={headingStyle}>¿A dónde lo enviamos?</h2>
        {(
          [
            ["state", "Estado"],
            ["city", "Ciudad"],
            ["municipality", "Municipio"],
            ["reference", "Punto de referencia"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} style={{ display: "grid", gap: 8, marginBottom: spaceTokens[3] }}>
            {label}
            <input
              style={inputStyle}
              value={address[key]}
              required
              onChange={(event) => setAddress({ ...address, [key]: event.target.value })}
            />
          </label>
        ))}
        <button type="submit" style={buttonStyle}>
          Continuar al pago
        </button>
        <p style={{ ...mutedStyle, marginTop: spaceTokens[3] }}>
          <Link href="/carrito" style={{ color: colors.primary }}>
            Volver al carrito
          </Link>
        </p>
      </form>
    </PageFrame>
  );
}
