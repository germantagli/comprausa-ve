"use client";

import {
  ApiClientError,
  createQuote,
  getCart,
  removeCartItem,
  saveCartItem,
  setCartQuantity,
  type CartView,
} from "@comprausa/api-client";
import { subtotalLabel } from "@comprausa/utils";
import { formatUsdFromMinor } from "@comprausa/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiBase } from "../lib/api";
import { readSession } from "../lib/session";
import { PageFrame } from "./page-frame";
import {
  badgeStyle,
  bodyStyle,
  buttonStyle,
  cardStyle,
  errorStyle,
  headingStyle,
  inputStyle,
  linkStyle,
  mutedStyle,
  secondaryButtonStyle,
  spaceTokens,
  colors,
  summaryBoxStyle,
  titleStyle,
} from "./styles";

const emptyAddress = { state: "", city: "", municipality: "", reference: "" };

export function CartScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "signed-out" | "error" | "ready">("loading");
  const [cart, setCart] = useState<CartView | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState(emptyAddress);
  const [pastedUrl, setPastedUrl] = useState("");

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setPhase("signed-out");
      return;
    }
    let cancelled = false;
    setPhase("loading");
    getCart(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setCart(next);
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

  async function mutate(action: (token: string) => Promise<CartView>): Promise<void> {
    const session = readSession();
    if (!session) {
      setPhase("signed-out");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setCart(await action(session.accessToken));
      setPhase("ready");
    } catch {
      setError("No pudimos actualizar el carrito.");
    } finally {
      setBusy(false);
    }
  }

  async function requestQuote(event: FormEvent): Promise<void> {
    event.preventDefault();
    const session = readSession();
    if (!session) {
      setPhase("signed-out");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const quote = await createQuote(apiBase, session.accessToken, {
        address,
        ...(pastedUrl.trim().length > 0 ? { pastedUrl: pastedUrl.trim() } : {}),
      });
      router.push(`/cotizacion/${quote.id}`);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 400 ? "Revisa la dirección y el enlace." : "No pudimos pedir la cotización.");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Carrito</h1>
        <p style={bodyStyle}>Cargando…</p>
      </PageFrame>
    );
  }
  if (phase === "signed-out") {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Carrito</h1>
        <p style={bodyStyle}>
          Entra para ver tu carrito.{" "}
          <Link href="/entrar" style={linkStyle}>
            Entrar
          </Link>
        </p>
      </PageFrame>
    );
  }
  if (phase === "error" || !cart) {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Carrito</h1>
        <p role="alert" style={errorStyle}>
          No pudimos cargar el carrito.
        </p>
        <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
          Reintentar
        </button>
      </PageFrame>
    );
  }

  const activeCount = cart.groups.reduce((count, group) => count + group.items.length, 0);
  return (
    <PageFrame wide>
      <h1 style={titleStyle}>Carrito</h1>
      <div className="cve-cart-layout">
        <div>
          {activeCount === 0 && cart.saved.length === 0 ? (
            <p role="status" style={bodyStyle}>
              Tu carrito está vacío.
            </p>
          ) : null}
          {cart.groups.map((group) => (
            <section key={group.storeName} aria-label={group.storeName} style={{ marginBottom: spaceTokens[4] }}>
              <h2 style={headingStyle}>{group.storeName}</h2>
              {group.items.map((item) => (
                <LineEditor
                  key={item.productId}
                  item={item}
                  busy={busy}
                  onQuantity={(quantity) => void mutate((token) => setCartQuantity(apiBase, token, item.productId, quantity))}
                  onRemove={() => void mutate((token) => removeCartItem(apiBase, token, item.productId))}
                  onSave={() => void mutate((token) => saveCartItem(apiBase, token, item.productId, true))}
                  saveLabel="Guardar para después"
                />
              ))}
            </section>
          ))}
          {cart.saved.length > 0 ? (
            <section aria-label="Guardados para después">
              <h2 style={headingStyle}>Guardados para después</h2>
              {cart.saved.map((item) => (
                <LineEditor
                  key={item.productId}
                  item={item}
                  busy={busy}
                  onQuantity={(quantity) => void mutate((token) => setCartQuantity(apiBase, token, item.productId, quantity))}
                  onRemove={() => void mutate((token) => removeCartItem(apiBase, token, item.productId))}
                  onSave={() => void mutate((token) => saveCartItem(apiBase, token, item.productId, false))}
                  saveLabel="Volver al carrito"
                />
              ))}
            </section>
          ) : null}

          <form onSubmit={(event) => void requestQuote(event)} style={{ ...cardStyle, marginTop: spaceTokens[4] }}>
            <h2 style={headingStyle}>Dirección en Venezuela</h2>
            <AddressFields address={address} onChange={setAddress} />
            <label style={{ display: "grid", gap: 8, marginTop: 16 }}>
              Pegar un enlace
              <input style={inputStyle} value={pastedUrl} onChange={(event) => setPastedUrl(event.target.value)} inputMode="url" placeholder="https://" />
            </label>
            <p style={mutedStyle}>La URL se guarda como texto. No la descargamos.</p>
            {error ? (
              <p role="alert" style={errorStyle}>
                {error}
              </p>
            ) : null}
            <button type="submit" style={buttonStyle} disabled={busy}>
              {busy ? "Espera…" : "Pedir cotización"}
            </button>
            <p style={mutedStyle}>El pago llega después de que el equipo publique el importe de la cotización.</p>
            <p style={mutedStyle}>
              <Link href="/pago" style={linkStyle}>
                Ver maqueta de checkout
              </Link>
            </p>
          </form>
        </div>

        <aside style={summaryBoxStyle} aria-label="Resumen del pedido">
          <h2 style={{ ...headingStyle, margin: 0 }}>Resumen del pedido</h2>
          <SummaryLine label="Subtotal" value={subtotalLabel(cart.subtotal)} />
          <SummaryLine label="Envío en USA" value="Por cotización" />
          <SummaryLine label="Comisión del servicio" value="Por cotización" />
          <SummaryLine label="Envío a Venezuela" value="Por cotización" />
          <hr style={{ border: 0, borderTop: `1px solid ${colors.border}`, margin: 0 }} />
          <p style={{ ...headingStyle, margin: 0 }}>Total estimado</p>
          <p style={{ ...bodyStyle, fontWeight: 700, margin: 0 }}>{subtotalLabel(cart.subtotal)}</p>
          <p style={mutedStyle}>Sin montos inventados. El total final sale de la cotización revisada.</p>
          <Link href="/pago" style={{ ...buttonStyle, alignItems: "center", display: "inline-flex", justifyContent: "center", textDecoration: "none" }}>
            Continuar al pago →
          </Link>
        </aside>
      </div>
    </PageFrame>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
      <span style={mutedStyle}>{label}</span>
      <span style={{ ...bodyStyle, margin: 0, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function LineEditor({
  item,
  busy,
  onQuantity,
  onRemove,
  onSave,
  saveLabel,
}: {
  item: CartView["saved"][number];
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  return (
    <article style={{ ...cardStyle, marginBottom: spaceTokens[3] }}>
      <p style={{ margin: 0 }}>
        <span style={badgeStyle}>Ficticio</span>
      </p>
      <h3 style={{ ...headingStyle, margin: 0 }}>
        <Link href={`/producto/${item.productId}`}>{item.name}</Link>
      </h3>
      <p style={bodyStyle}>{item.unitAmountMinor === null ? "Precio por cotización" : formatUsdFromMinor(item.unitAmountMinor)}</p>
      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button
          type="button"
          style={{ ...secondaryButtonStyle, minWidth: 44, padding: 0 }}
          disabled={busy}
          onClick={() => {
            const next = Math.max(1, Number(quantity) - 1);
            setQuantity(String(next));
            onQuantity(next);
          }}
        >
          −
        </button>
        <label style={{ display: "grid", gap: 4 }}>
          Cantidad
          <input
            style={{ ...inputStyle, maxWidth: 72, textAlign: "center" }}
            value={quantity}
            inputMode="numeric"
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <button
          type="button"
          style={{ ...secondaryButtonStyle, minWidth: 44, padding: 0 }}
          disabled={busy}
          onClick={() => {
            const next = Math.max(1, Number(quantity) + 1);
            setQuantity(String(next));
            onQuantity(next);
          }}
        >
          +
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <button type="button" style={secondaryButtonStyle} disabled={busy} onClick={() => onQuantity(Number(quantity))}>
          Actualizar
        </button>
        <button type="button" style={secondaryButtonStyle} disabled={busy} onClick={onRemove}>
          Eliminar
        </button>
        <button type="button" style={secondaryButtonStyle} disabled={busy} onClick={onSave}>
          {saveLabel}
        </button>
      </div>
    </article>
  );
}

function AddressFields({
  address,
  onChange,
}: {
  address: typeof emptyAddress;
  onChange: (next: typeof emptyAddress) => void;
}) {
  const fields = [
    ["state", "Estado"],
    ["city", "Ciudad"],
    ["municipality", "Municipio"],
    ["reference", "Punto de referencia"],
  ] as const;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {fields.map(([key, label]) => (
        <label key={key} style={{ display: "grid", gap: 8 }}>
          {label}
          <input style={inputStyle} value={address[key]} required onChange={(event) => onChange({ ...address, [key]: event.target.value })} />
        </label>
      ))}
    </div>
  );
}
