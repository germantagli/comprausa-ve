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
import { bodyStyle, buttonStyle, cardStyle, colors, errorStyle, headingStyle, pageStyle, rowStyle, secondaryButtonStyle, titleStyle } from "./styles";

type Detail = { product: CatalogDetail; pricing: CatalogPricing; availability: CatalogAvailability };

export function ProductDetail({ productId }: { productId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "error" | "missing" | "ready">("loading");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      <main style={pageStyle} aria-busy="true">
        <p style={bodyStyle}>Cargando…</p>
      </main>
    );
  }
  if (phase === "missing") {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Ficha</h1>
        <p role="status" style={bodyStyle}>
          No encontramos ese artículo.
        </p>
      </main>
    );
  }
  if (phase === "error" || !detail) {
    return (
      <main style={pageStyle}>
        <p role="alert" style={errorStyle}>
          No pudimos cargar la ficha.
        </p>
        <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
          Reintentar
        </button>
      </main>
    );
  }

  const { product, pricing, availability } = detail;
  return (
    <main style={pageStyle}>
      <article style={cardStyle}>
        <p style={bodyStyle}>
          <span style={badgeStyle}>Ficticio</span>
        </p>
        <PhotoSlot photos={product.photos} />
        <h1 style={titleStyle}>{product.name}</h1>
        <p style={bodyStyle}>Marca: {product.brand ?? "Sin marca en esta ficha."}</p>
        <p style={bodyStyle}>Tienda: {product.store?.name ?? "Sin tienda."}</p>
        <p style={headingStyle}>{catalogPriceLabel(pricing)}</p>
        <VariantSlot variants={product.variants} />
        <p style={bodyStyle}>{availabilityLabel(availability)}</p>
        <p style={bodyStyle}>{product.description}</p>
        <p style={bodyStyle}>{product.disclaimer}</p>
        <div style={rowStyle}>
          <button type="button" style={buttonStyle} disabled={busy} onClick={() => void add(false)}>
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
    </main>
  );
}

function PhotoSlot({ photos }: { photos: readonly string[] }) {
  if (photos.length === 0) {
    return (
      <p role="status" style={bodyStyle}>
        No hay fotos.
      </p>
    );
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {photos.map((photo) => (
        <li key={photo}>{photo}</li>
      ))}
    </ul>
  );
}

function VariantSlot({ variants }: { variants: readonly { id: string; name: string }[] }) {
  if (variants.length === 0) {
    return (
      <p role="status" style={bodyStyle}>
        No hay variantes.
      </p>
    );
  }
  return (
    <ul>
      {variants.map((variant) => (
        <li key={variant.id}>{variant.name}</li>
      ))}
    </ul>
  );
}

function availabilityLabel(availability: CatalogAvailability): string {
  if (availability.status === "UNKNOWN" || availability.quantity === null) {
    return `Disponibilidad desconocida. ${availability.note}`;
  }
  return `Disponibilidad: ${availability.quantity}. ${availability.note}`;
}

const badgeStyle = {
  border: `1px solid ${colors.deep}`,
  borderRadius: 8,
  display: "inline-block",
  fontSize: 12,
  lineHeight: "16px",
  padding: "2px 8px",
} as const;
