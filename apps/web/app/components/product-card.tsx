"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type MouseEvent } from "react";
import { useDemoCommerce } from "../lib/demo-commerce";
import { formatDemoPrice, type DemoProduct } from "../lib/products.mock";
import { IconCartSmall, IconHeart } from "./icons";
import { colors } from "./styles";

type Variant = "grid" | "compact";

/**
 * Shared DEMO product card for Explorar grid and Home featured carousel.
 * Add-to-cart uses mock commerce state only — never the backend cart API.
 */
export function ProductCard({ product, variant = "grid" }: { product: DemoProduct; variant?: Variant }) {
  const router = useRouter();
  const { addToCart, toggleFavorite, isFavorite } = useDemoCommerce();
  const [pressed, setPressed] = useState(false);
  const favorite = isFavorite(product.id);
  const compact = variant === "compact";
  const detailHref = `/producto/${product.id}`;

  function onAdd(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (product.requiresVariant) {
      router.push(detailHref);
      return;
    }
    addToCart(product);
  }

  function onFav(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(product.id);
  }

  return (
    <article style={{ ...card, ...(compact ? cardCompact : null) }}>
      <div style={photo}>
        {product.discountPercent ? <span style={discountBadge}>-{product.discountPercent}%</span> : null}
        <button type="button" aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"} onClick={onFav} style={favHit}>
          <IconHeart filled={favorite} />
        </button>
        <Link href={detailHref} aria-label={`Ver ${product.name}`} style={imageLink}>
          <div style={imageFrame}>
            <Image src={product.image} alt={product.name} fill unoptimized sizes={compact ? "132px" : "50vw"} style={image} />
          </div>
        </Link>
      </div>

      <Link href={detailHref} style={nameLink}>
        <p style={{ ...name, ...(compact ? nameCompact : null) }}>{product.name}</p>
      </Link>

      <div style={priceRow}>
        <span style={price}>{formatDemoPrice(product.price)}</span>
        {product.compareAtPrice ? <span style={compare}>{formatDemoPrice(product.compareAtPrice)}</span> : null}
      </div>

      <div style={ratingRow} aria-label={`${product.rating} estrellas, ${product.reviewCount} reseñas`}>
        <span aria-hidden="true" style={{ color: "#F5A524", fontSize: 12, letterSpacing: 1, lineHeight: 1 }}>
          {"★".repeat(Math.max(1, Math.round(product.rating)))}
        </span>
        <span style={reviews}>({product.reviewCount})</span>
      </div>

      <button
        type="button"
        onClick={onAdd}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        style={{
          ...addBtn,
          ...(compact ? addBtnCompact : null),
          opacity: pressed ? 0.88 : 1,
          transform: pressed ? "scale(0.98)" : "none",
        }}
      >
        <IconCartSmall light />
        <span>Agregar</span>
      </button>
    </article>
  );
}

const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #E8EEF5",
  borderRadius: 15,
  boxShadow: "0 4px 14px rgba(20,36,59,0.06)",
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  padding: 11,
};

const cardCompact: CSSProperties = {
  borderRadius: 14,
  flex: "0 0 148px",
  padding: 8,
  width: 148,
};

const photo: CSSProperties = {
  aspectRatio: "1 / 1",
  background: "#FFFFFF",
  borderRadius: 10,
  marginBottom: 8,
  overflow: "hidden",
  position: "relative",
  width: "100%",
};

const discountBadge: CSSProperties = {
  background: "#E11D48",
  borderRadius: 999,
  color: "#fff",
  fontSize: 10,
  fontWeight: 800,
  left: 8,
  padding: "3px 7px",
  position: "absolute",
  top: 8,
  zIndex: 2,
};

const favHit: CSSProperties = {
  alignItems: "center",
  background: "rgba(255,255,255,0.92)",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  display: "inline-flex",
  height: 30,
  justifyContent: "center",
  padding: 0,
  position: "absolute",
  right: 6,
  top: 6,
  width: 30,
  zIndex: 2,
};

const imageLink: CSSProperties = { bottom: 0, display: "block", left: 0, position: "absolute", right: 0, top: 0 };
const imageFrame: CSSProperties = { bottom: 10, left: 10, position: "absolute", right: 10, top: 10 };
const image: CSSProperties = { objectFit: "contain", objectPosition: "center" };

const nameLink: CSSProperties = { color: "inherit", flex: 1, textDecoration: "none" };
const name: CSSProperties = {
  color: colors.deep,
  display: "-webkit-box",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.25,
  margin: "0 0 6px",
  minHeight: 32,
  overflow: "hidden",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
};
const nameCompact: CSSProperties = { fontSize: 12, minHeight: 30 };

const priceRow: CSSProperties = { alignItems: "baseline", display: "flex", gap: 6, marginBottom: 4 };
const price: CSSProperties = { color: colors.primary, fontSize: 15, fontWeight: 800 };
const compare: CSSProperties = { color: "#94A3B8", fontSize: 12, fontWeight: 500, textDecoration: "line-through" };

const ratingRow: CSSProperties = { alignItems: "center", display: "flex", gap: 4, marginBottom: 10 };
const reviews: CSSProperties = { color: "#94A3B8", fontSize: 11 };

const addBtn: CSSProperties = {
  alignItems: "center",
  background: colors.primary,
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  font: "inherit",
  fontSize: 13,
  fontWeight: 700,
  gap: 6,
  justifyContent: "center",
  marginTop: "auto",
  minHeight: 38,
  padding: "0 10px",
  transition: "opacity 120ms ease, transform 120ms ease",
  width: "100%",
};

const addBtnCompact: CSSProperties = {
  fontSize: 12,
  gap: 4,
  minHeight: 34,
  padding: "0 8px",
};
