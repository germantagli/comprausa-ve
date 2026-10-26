"use client";

import {
  ApiClientError,
  addCartItem,
  getCatalogAvailability,
  getCatalogPricing,
  getCatalogProduct,
  type CatalogAvailability,
  type CatalogDetail,
  type CatalogPricing,
} from "@comprausa/api-client";
import { catalogPriceLabel } from "@comprausa/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { readSession } from "../lib/session";
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
  rowStyle,
  secondaryButtonStyle,
  spaceTokens,
  titleStyle,
} from "./styles";

type Detail = { product: CatalogDetail; pricing: CatalogPricing; availability: CatalogAvailability };

export function ProductDetail({ productId }: { productId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "error" | "missing" | "ready">("loading");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
        setPhase(caught instanceof ApiClientError && caught.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [productId, attempt]);

  async function add(thenCart: boolean): Promise<void> {
    const session = readSession();
    if (!session) {
      setError("Entra para usar el carrito.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await addCartItem(apiBase, session.accessToken, productId, 1);
      if (thenCart) {
        router.push("/carrito");
        return;
      }
      setMessage("Lo agregamos al carrito.");
    } catch {
      setError("No pudimos agregar el artículo.");
    } finally {
      setBusy(false);
    }
  }

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
  return (
    <PageFrame wide>
      <p style={mutedStyle}>
        <Link href="/" style={linkStyle}>
          Inicio
        </Link>
        {" / "}
        <Link href="/explorar" style={linkStyle}>
          Catálogo
        </Link>
        {" / "}
        {product.name}
      </p>
      <div className="cve-pdp-layout">
        <div style={{ ...cardStyle, gap: spaceTokens[3] }}>
          <PhotoSlot photos={product.photos} />
        </div>
        <article style={{ ...cardStyle, gap: spaceTokens[3] }}>
          <p style={{ margin: 0 }}>
            <span style={badgeStyle}>Ficticio</span>
          </p>
          <h1 style={titleStyle}>{product.name}</h1>
          <p style={mutedStyle}>Tienda: {product.store?.name ?? "Sin tienda."}</p>
          <p style={mutedStyle}>Marca: {product.brand ?? "Sin marca en esta ficha."}</p>
          <p style={{ ...headingStyle, fontSize: 22, margin: 0 }}>{catalogPriceLabel(pricing)}</p>
          <p style={bodyStyle}>{availabilityLabel(availability)}</p>
          <VariantSlot
            variants={product.variants}
            selectedId={selectedVariant}
            onSelect={setSelectedVariant}
          />
          <p style={bodyStyle}>{product.description}</p>
          <p style={mutedStyle}>{product.disclaimer}</p>
          <div style={rowStyle}>
            <button type="button" style={{ ...buttonStyle, minWidth: 180 }} disabled={busy} onClick={() => void add(false)}>
              {busy ? "Espera…" : "Agregar al carrito"}
            </button>
            <button type="button" style={secondaryButtonStyle} disabled={busy} onClick={() => void add(true)}>
              Comprar ahora
            </button>
          </div>
          {message ? (
            <p role="status" style={{ color: colors.success, marginTop: 12 }}>
              {message} <Link href="/carrito">Ver carrito</Link>
            </p>
          ) : null}
          {error ? (
            <p role="alert" style={errorStyle}>
              {error} {error.startsWith("Entra") ? <Link href="/entrar">Entrar</Link> : null}
            </p>
          ) : null}
        </article>
      </div>
      <section style={{ ...cardStyle, marginTop: spaceTokens[6] }}>
        <h2 style={headingStyle}>Detalle</h2>
        <p style={bodyStyle}>{product.description}</p>
        <p style={mutedStyle}>Envío y reseñas reales no forman parte del catálogo demo.</p>
      </section>
    </PageFrame>
  );
}

function PhotoSlot({ photos }: { photos: readonly string[] }) {
  if (photos.length === 0) {
    return (
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
        No hay fotos.
      </div>
    );
  }
  return (
    <ul style={{ display: "grid", gap: 12, listStyle: "none", margin: 0, padding: 0 }}>
      {photos.map((photo) => (
        <li key={photo} style={{ ...cardStyle, margin: 0 }}>
          {photo}
        </li>
      ))}
    </ul>
  );
}

function VariantSlot({
  variants,
  selectedId,
  onSelect,
}: {
  variants: readonly { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (variants.length === 0) {
    return (
      <p role="status" style={mutedStyle}>
        No hay variantes.
      </p>
    );
  }
  return (
    <div>
      <p style={headingStyle}>Opciones</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {variants.map((variant) => {
          const selected = variant.id === selectedId;
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
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
    </div>
  );
}

function availabilityLabel(availability: CatalogAvailability): string {
  if (availability.status === "UNKNOWN" || availability.quantity === null) {
    return `Disponibilidad desconocida. ${availability.note}`;
  }
  return `Disponibilidad: ${availability.quantity}. ${availability.note}`;
}
