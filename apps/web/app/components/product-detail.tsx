"use client";

import {
  ApiClientError,
  getCatalogAvailability,
  getCatalogPricing,
  getCatalogProduct,
  type CatalogAvailability,
  type CatalogDetail,
  type CatalogPricing,
} from "@comprausa/api-client";
import { catalogPriceLabel } from "@comprausa/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { apiBase } from "../lib/api";
import { useDemoCommerce } from "../lib/demo-commerce";
import { demoProductDetail, maquetaPriceFor } from "../lib/demo-catalog";
import { formatDemoPrice, getDemoProduct } from "../lib/products.mock";
import { PageFrame } from "./page-frame";
import {
  badgeStyle,
  bodyStyle,
  buttonStyle,
  cardStyle,
  colors,
  errorStyle,
  headingStyle,
  linkStyle,
  mutedStyle,
  secondaryButtonStyle,
  spaceTokens,
  titleStyle,
} from "./styles";

const DEMO_VARIANTS: Record<string, string[]> = {
  "demo-zapatos": ["36", "37", "38", "39", "40", "41", "42"],
  "demo-camiseta": ["S", "M", "L", "XL"],
};

type Detail = {
  product: CatalogDetail;
  pricing: CatalogPricing;
  availability: CatalogAvailability;
  maquetaPriceLabel?: string;
};

/**
 * Product detail — DEMO products from products.mock first; API/demo-catalog fallback otherwise.
 * Checkout is not implemented yet.
 */
export function ProductDetail({ productId }: { productId: string }) {
  const demo = getDemoProduct(productId);
  if (demo) {
    return <DemoProductDetail productId={productId} />;
  }
  return <LegacyCatalogDetail productId={productId} />;
}

function DemoProductDetail({ productId }: { productId: string }) {
  const product = getDemoProduct(productId)!;
  const { addToCart, toast, clearToast, toggleFavorite, isFavorite } = useDemoCommerce();
  const variants = DEMO_VARIANTS[product.id] ?? [];
  const [selected, setSelected] = useState<string | null>(variants[0] ?? null);
  const favorite = isFavorite(product.id);

  function onAdd(): void {
    if (product.requiresVariant && !selected) {
      return;
    }
    addToCart(product, selected ?? undefined);
  }

  return (
    <PageFrame compact>
      <div style={demoRoot}>
        <p style={demoCrumb}>
          <Link href="/explorar" style={linkStyle}>
            Explorar
          </Link>
          {" / "}
          {product.name}
        </p>

        <div style={demoPhoto}>
          <Image src={product.image} alt={product.name} fill unoptimized sizes="430px" style={{ objectFit: "contain" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: "0 0 6px" }}>
              <span style={badgeStyle}>DEMO</span>
            </p>
            <h1 style={{ ...titleStyle, color: colors.deep, marginBottom: 6 }}>{product.name}</h1>
            <p style={{ color: colors.muted, fontSize: 13, margin: 0 }}>{product.category}</p>
          </div>
          <button
            type="button"
            aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            onClick={() => toggleFavorite(product.id)}
            style={favBtn}
          >
            {favorite ? "♥" : "♡"}
          </button>
        </div>

        <div style={{ alignItems: "baseline", display: "flex", gap: 8 }}>
          <span style={{ color: colors.primary, fontSize: 24, fontWeight: 800 }}>{formatDemoPrice(product.price)}</span>
          {product.compareAtPrice ? (
            <span style={{ color: "#94A3B8", textDecoration: "line-through" }}>{formatDemoPrice(product.compareAtPrice)}</span>
          ) : null}
        </div>

        <p style={{ color: colors.muted, fontSize: 13, margin: 0 }}>
          ★ {product.rating.toFixed(1)} · {product.reviewCount} reseñas (mock)
        </p>

        {variants.length > 0 ? (
          <div>
            <p style={{ ...headingStyle, marginBottom: 8 }}>Selecciona {product.id === "demo-zapatos" ? "talla" : "talla"}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {variants.map((variant) => {
                const on = selected === variant;
                return (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => setSelected(variant)}
                    style={{
                      background: on ? colors.primary : "#fff",
                      border: `1px solid ${on ? colors.primary : "#D7E0EC"}`,
                      borderRadius: 999,
                      color: on ? "#fff" : colors.deep,
                      cursor: "pointer",
                      font: "inherit",
                      fontWeight: 700,
                      minHeight: 40,
                      minWidth: 44,
                      padding: "0 12px",
                    }}
                  >
                    {variant}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <p style={mutedStyle}>
          Ficha de demostración. Precios y valoraciones son ficticios. El checkout completo llega en una próxima pantalla.
        </p>

        <button type="button" onClick={onAdd} style={{ ...buttonStyle, width: "100%" }}>
          Agregar al carrito
        </button>
        <Link href="/carrito" style={{ ...secondaryButtonStyle, display: "grid", placeItems: "center", textDecoration: "none" }}>
          Ver carrito
        </Link>
      </div>

      {toast ? (
        <div role="status" aria-live="polite" onClick={clearToast} style={toastStyle}>
          {toast}
        </div>
      ) : null}
    </PageFrame>
  );
}

function LegacyCatalogDetail({ productId }: { productId: string }) {
  const [phase, setPhase] = useState<"loading" | "error" | "missing" | "ready">("loading");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    Promise.all([
      getCatalogProduct(apiBase, productId),
      getCatalogPricing(apiBase, productId),
      getCatalogAvailability(apiBase, productId),
    ])
      .then(([product, pricing, availability]) => {
        if (!cancelled) {
          setDetail({ product, pricing, availability });
          setSelectedVariant(product.variants[0]?.id ?? null);
          setPhase("ready");
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        const fallback = demoProductDetail(productId);
        if (fallback) {
          setDetail({
            product: fallback.product,
            pricing: fallback.pricing,
            availability: fallback.availability,
            maquetaPriceLabel: fallback.maquetaPriceLabel,
          });
          setSelectedVariant(fallback.product.variants[0]?.id ?? null);
          setPhase("ready");
          return;
        }
        setPhase(caught instanceof ApiClientError && caught.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [productId, attempt]);

  if (phase === "loading") {
    return (
      <PageFrame>
        <p style={bodyStyle} aria-busy="true">
          Cargando…
        </p>
      </PageFrame>
    );
  }
  if (phase === "missing") {
    return (
      <PageFrame>
        <h1 style={titleStyle}>Ficha</h1>
        <p role="status" style={bodyStyle}>
          No encontramos ese artículo.
        </p>
        <Link href="/explorar" style={linkStyle}>
          Volver a Explorar
        </Link>
      </PageFrame>
    );
  }
  if (phase === "error" || !detail) {
    return (
      <PageFrame>
        <p role="alert" style={errorStyle}>
          No pudimos cargar la ficha.
        </p>
        <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
          Reintentar
        </button>
      </PageFrame>
    );
  }

  const { product, pricing, availability } = detail;
  const maqueta = detail.maquetaPriceLabel ?? maquetaPriceFor(product.id);
  const priceShown = maqueta ?? catalogPriceLabel(pricing);

  return (
    <PageFrame wide>
      <p style={mutedStyle}>
        <Link href="/" style={linkStyle}>
          Inicio
        </Link>
        {" / "}
        <Link href="/explorar" style={linkStyle}>
          Explorar
        </Link>
        {" / "}
        {product.name}
      </p>
      <div className="cve-pdp-layout">
        <div style={{ ...cardStyle, gap: spaceTokens[3] }}>
          <div
            role="status"
            style={{
              alignItems: "center",
              background: `linear-gradient(160deg, ${colors.background}, ${colors.border})`,
              borderRadius: 12,
              color: colors.muted,
              display: "flex",
              fontWeight: 600,
              justifyContent: "center",
              minHeight: 280,
            }}
          >
            Catálogo demo
          </div>
        </div>
        <article style={{ ...cardStyle, gap: spaceTokens[3] }}>
          <p style={{ margin: 0 }}>
            <span style={badgeStyle}>Ficticio</span>
          </p>
          <h1 style={titleStyle}>{product.name}</h1>
          <p style={{ ...headingStyle, fontSize: 22, margin: 0 }}>{priceShown}</p>
          <p style={bodyStyle}>
            {availability.status === "UNKNOWN" || availability.quantity === null
              ? `Disponibilidad desconocida. ${availability.note}`
              : `Disponibilidad: ${availability.quantity}. ${availability.note}`}
          </p>
          {product.variants.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {product.variants.map((variant) => {
                const selected = variant.id === selectedVariant;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariant(variant.id)}
                    style={{
                      background: selected ? colors.primary : colors.surface,
                      border: `1px solid ${selected ? colors.primary : colors.border}`,
                      borderRadius: 999,
                      color: selected ? colors.primaryOn : colors.text,
                      cursor: "pointer",
                      font: "inherit",
                      minHeight: 40,
                      padding: "0 14px",
                    }}
                  >
                    {variant.name}
                  </button>
                );
              })}
            </div>
          ) : null}
          <p style={bodyStyle}>{product.description}</p>
          <p style={mutedStyle}>Usa el catálogo DEMO en Explorar para el carrito mock compartido.</p>
          <Link href="/explorar" style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Ir a Explorar
          </Link>
        </article>
      </div>
    </PageFrame>
  );
}

const demoRoot: CSSProperties = {
  display: "grid",
  gap: 14,
  margin: "0 auto",
  maxWidth: 430,
  width: "100%",
};

const demoCrumb: CSSProperties = { color: colors.muted, fontSize: 13, margin: 0 };

const demoPhoto: CSSProperties = {
  aspectRatio: "1 / 1",
  background: "#FFFFFF",
  border: "1px solid #E8EEF5",
  borderRadius: 16,
  overflow: "hidden",
  position: "relative",
  width: "100%",
};

const favBtn: CSSProperties = {
  alignItems: "center",
  background: "#F7FAFD",
  border: "1px solid #E4EAF1",
  borderRadius: 999,
  color: "#E11D48",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 20,
  height: 40,
  justifyContent: "center",
  width: 40,
};

const toastStyle: CSSProperties = {
  background: colors.deep,
  borderRadius: 12,
  bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
  boxShadow: "0 8px 24px rgba(13,58,122,0.28)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  left: "50%",
  padding: "12px 18px",
  position: "fixed",
  transform: "translateX(-50%)",
  whiteSpace: "nowrap",
  zIndex: 5,
};
