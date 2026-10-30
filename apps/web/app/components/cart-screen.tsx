"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useDemoCommerce } from "../lib/demo-commerce";
import { formatDemoPrice } from "../lib/products.mock";
import { PageFrame } from "./page-frame";
import { colors, radiusTokens } from "./styles";

/**
 * DEMO cart — items come from local mock commerce state (shared with Home / Explorar).
 * No backend cart / payments. Checkout is intentionally not implemented yet.
 */
export function CartScreen() {
  const { cart, ready, updateQuantity, removeFromCart, clearCart, getCartSubtotal, getCartCount } =
    useDemoCommerce();

  if (!ready) {
    return (
      <PageFrame compact>
        <h1 style={title}>Carrito</h1>
        <p style={{ color: colors.muted }}>Cargando…</p>
      </PageFrame>
    );
  }

  const count = getCartCount();
  const subtotal = getCartSubtotal();

  return (
    <PageFrame compact>
      <div style={root}>
        <header style={header}>
          <h1 style={title}>Carrito</h1>
          {count > 0 ? (
            <button type="button" onClick={clearCart} style={clearLink}>
              Vaciar
            </button>
          ) : null}
        </header>

        {count === 0 ? (
          <div style={emptyBox} role="status">
            <p style={emptyTitle}>Tu carrito está vacío</p>
            <p style={emptyBody}>Explora el catálogo de demostración y agrega productos.</p>
            <Link href="/explorar" style={primaryCta}>
              Explorar productos
            </Link>
          </div>
        ) : (
          <>
            <ul style={list}>
              {cart.map((item) => (
                <li key={item.itemId} style={row}>
                  <div style={thumb}>
                    <Image src={item.image} alt="" fill unoptimized sizes="72px" style={{ objectFit: "contain" }} />
                  </div>
                  <div style={meta}>
                    <p style={name}>{item.name}</p>
                    {item.variant ? <p style={variant}>Variante: {item.variant}</p> : null}
                    <p style={price}>{formatDemoPrice(item.unitPrice)}</p>
                    <div style={qtyRow}>
                      <button
                        type="button"
                        aria-label="Disminuir cantidad"
                        onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                        style={qtyBtn}
                      >
                        −
                      </button>
                      <span style={qtyValue}>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Aumentar cantidad"
                        onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                        style={qtyBtn}
                      >
                        +
                      </button>
                      <button type="button" onClick={() => removeFromCart(item.itemId)} style={removeBtn}>
                        Quitar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div style={summary}>
              <div style={summaryRow}>
                <span>Subtotal DEMO</span>
                <strong>{formatDemoPrice(subtotal)}</strong>
              </div>
              <p style={note}>Precios ficticios para demostración. El checkout real llega en una próxima pantalla.</p>
              <Link href="/explorar" style={secondaryCta}>
                Seguir explorando
              </Link>
            </div>
          </>
        )}
      </div>
    </PageFrame>
  );
}

const root: CSSProperties = { display: "grid", gap: 14, margin: "0 auto", maxWidth: 430, width: "100%" };
const header: CSSProperties = { alignItems: "center", display: "flex", justifyContent: "space-between" };
const title: CSSProperties = { color: colors.deep, fontSize: 22, fontWeight: 800, margin: 0 };
const clearLink: CSSProperties = {
  background: "none",
  border: "none",
  color: "#E11D48",
  cursor: "pointer",
  font: "inherit",
  fontSize: 14,
  fontWeight: 700,
};

const emptyBox: CSSProperties = {
  background: "#fff",
  border: "1px solid #E8EEF5",
  borderRadius: radiusTokens.md,
  display: "grid",
  gap: 10,
  justifyItems: "center",
  padding: "32px 16px",
  textAlign: "center",
};
const emptyTitle: CSSProperties = { color: colors.deep, fontSize: 17, fontWeight: 800, margin: 0 };
const emptyBody: CSSProperties = { color: colors.muted, fontSize: 14, margin: 0 };

const list: CSSProperties = { display: "grid", gap: 10, listStyle: "none", margin: 0, padding: 0 };
const row: CSSProperties = {
  background: "#fff",
  border: "1px solid #E8EEF5",
  borderRadius: 14,
  display: "flex",
  gap: 12,
  padding: 12,
};
const thumb: CSSProperties = {
  background: "#F7FAFD",
  borderRadius: 10,
  flex: "0 0 72px",
  height: 72,
  overflow: "hidden",
  position: "relative",
  width: 72,
};
const meta: CSSProperties = { display: "grid", flex: 1, gap: 4, minWidth: 0 };
const name: CSSProperties = { color: colors.deep, fontSize: 14, fontWeight: 700, margin: 0 };
const variant: CSSProperties = { color: colors.muted, fontSize: 12, margin: 0 };
const price: CSSProperties = { color: colors.primary, fontSize: 15, fontWeight: 800, margin: 0 };
const qtyRow: CSSProperties = { alignItems: "center", display: "flex", gap: 8, marginTop: 4 };
const qtyBtn: CSSProperties = {
  alignItems: "center",
  background: "#F1F4F8",
  border: "1px solid #E4EAF1",
  borderRadius: 8,
  color: colors.deep,
  cursor: "pointer",
  display: "inline-flex",
  font: "inherit",
  fontWeight: 700,
  height: 32,
  justifyContent: "center",
  width: 32,
};
const qtyValue: CSSProperties = { fontWeight: 700, minWidth: 20, textAlign: "center" };
const removeBtn: CSSProperties = {
  background: "none",
  border: "none",
  color: colors.muted,
  cursor: "pointer",
  font: "inherit",
  fontSize: 12,
  fontWeight: 600,
  marginLeft: "auto",
};

const summary: CSSProperties = {
  background: "#fff",
  border: "1px solid #E8EEF5",
  borderRadius: 14,
  display: "grid",
  gap: 10,
  padding: 14,
};
const summaryRow: CSSProperties = {
  alignItems: "center",
  color: colors.deep,
  display: "flex",
  fontSize: 16,
  justifyContent: "space-between",
};
const note: CSSProperties = { color: colors.muted, fontSize: 12, margin: 0 };
const primaryCta: CSSProperties = {
  background: colors.primary,
  borderRadius: 12,
  color: "#fff",
  fontWeight: 700,
  minHeight: 44,
  padding: "12px 18px",
  textDecoration: "none",
};
const secondaryCta: CSSProperties = {
  background: "#EAF3FF",
  borderRadius: 12,
  color: colors.primary,
  fontWeight: 700,
  minHeight: 44,
  padding: "12px 18px",
  textAlign: "center",
  textDecoration: "none",
};
