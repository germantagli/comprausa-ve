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
import { bodyStyle, buttonStyle, cardStyle, errorStyle, headingStyle, inputStyle, linkStyle, pageStyle, secondaryButtonStyle, titleStyle } from "./styles";

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
      <main style={pageStyle} aria-busy="true">
        <h1 style={titleStyle}>Carrito</h1>
        <p style={bodyStyle}>Cargando…</p>
      </main>
    );
  }
  if (phase === "signed-out") {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Carrito</h1>
        <p style={bodyStyle}>
          Entra para ver tu carrito. <Link href="/entrar" style={linkStyle}>Entrar</Link>
        </p>
      </main>
    );
  }
  if (phase === "error" || !cart) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Carrito</h1>
        <p role="alert" style={errorStyle}>
          No pudimos cargar el carrito.
        </p>
        <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
          Reintentar
        </button>
      </main>
    );
  }

  const activeCount = cart.groups.reduce((count, group) => count + group.items.length, 0);
  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Carrito</h1>
      {activeCount === 0 && cart.saved.length === 0 ? (
        <p role="status" style={bodyStyle}>
          Tu carrito está vacío.
        </p>
      ) : null}
      {cart.groups.map((group) => (
        <section key={group.storeName} aria-label={group.storeName}>
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
      <p style={headingStyle}>{subtotalLabel(cart.subtotal)}</p>
      <form onSubmit={(event) => void requestQuote(event)}>
        <h2 style={headingStyle}>Dirección en Venezuela</h2>
        <AddressFields address={address} onChange={setAddress} />
        <label style={{ display: "grid", gap: 8, marginTop: 16 }}>
          Pegar un enlace
          <input style={inputStyle} value={pastedUrl} onChange={(event) => setPastedUrl(event.target.value)} inputMode="url" placeholder="https://" />
        </label>
        <p style={bodyStyle}>La URL se guarda como texto. No la descargamos.</p>
        <button type="submit" style={buttonStyle} disabled={busy}>
          {busy ? "Espera…" : "Pedir cotización"}
        </button>
      </form>
      {error ? (
        <p role="alert" style={errorStyle}>
          {error}
        </p>
      ) : null}
    </main>
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
    <article style={cardStyle}>
      <p style={bodyStyle}>Ficticio</p>
      <h3 style={headingStyle}>
        <Link href={`/producto/${item.productId}`}>{item.name}</Link>
      </h3>
      <p style={bodyStyle}>{item.unitAmountMinor === null ? "Precio por cotización" : formatUsdFromMinor(item.unitAmountMinor)}</p>
      <label>
        Cantidad
        <input
          style={{ ...inputStyle, maxWidth: 96 }}
          value={quantity}
          inputMode="numeric"
          onChange={(event) => setQuantity(event.target.value)}
        />
      </label>
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
