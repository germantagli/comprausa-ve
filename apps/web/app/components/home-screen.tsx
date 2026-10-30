"use client";

import { probeServerReachable } from "@comprausa/api-client";
import { APP_BRAND_NAME } from "@comprausa/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { apiBase } from "../lib/api";
import {
  formatDemoPrice,
  homeDemoBadges,
  homeDemoCategories,
  homeDemoFeaturedProducts,
  homeDemoHero,
  homeDemoOffers,
  homeDemoRequest,
} from "../lib/home.mock";
import { IconBell, IconHeart, IconSearch } from "./icons";
import { PageFrame } from "./page-frame";
import { colors, radiusTokens } from "./styles";

/**
 * TraeLo Home — DEMO visual presentation matching the approved mock.
 * Featured products/prices/ratings come from home.mock.ts (not inventing live catalog).
 * Navigation stays functional; backend cart probe kept when a session exists.
 */
export function HomeScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [reachable, setReachable] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    setReachable(await probeServerReachable(apiBase));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function goExplore(query?: string): void {
    const text = query?.trim() ?? "";
    router.push(text.length > 0 ? `/explorar?text=${encodeURIComponent(text)}` : "/explorar");
  }

  return (
    <PageFrame compact>
      <div className="cve-fade-up" style={root}>
        {/* A — Header */}
        <header style={header}>
          <Link href="/" aria-label={APP_BRAND_NAME} style={{ display: "inline-flex", lineHeight: 0 }}>
            <Image src="/brand/logo-header.webp" alt={APP_BRAND_NAME} width={132} height={32} priority style={{ height: 28, width: "auto" }} />
          </Link>
          <div style={{ alignItems: "center", display: "flex", gap: 2 }}>
            <Link href="/perfil" aria-label="Favoritos" style={iconHit}>
              <IconHeart />
            </Link>
            <Link href="/pedidos" aria-label="Notificaciones" style={{ ...iconHit, position: "relative" }}>
              <IconBell />
              {homeDemoBadges.notifications > 0 ? <span style={badge}>{homeDemoBadges.notifications}</span> : null}
            </Link>
          </div>
        </header>

        {reachable === false ? (
          <button type="button" onClick={() => void refresh()} style={offline}>
            Sin conexión con el servidor. La Home DEMO sigue visible; toca para reintentar.
          </button>
        ) : null}

        {/* B — Search */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            goExplore(draft);
          }}
          style={searchShell}
        >
          <IconSearch />
          <input
            aria-label="Buscar productos en TraeLo"
            placeholder="Buscar productos en TraeLo..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            style={searchInput}
          />
        </form>

        {/* C — Hero: live text/CTA over provided illustration */}
        <section aria-label="Banner principal" style={hero}>
          <Image
            src={homeDemoHero.backgroundArt}
            alt=""
            fill
            priority
            unoptimized
            sizes="(max-width: 430px) 100vw, 430px"
            style={{ objectFit: "cover", objectPosition: "right center" }}
          />
          <div style={heroScrim} aria-hidden="true" />
          <div style={heroCopy}>
            <h1 style={heroTitle}>
              {homeDemoHero.titleBefore}
              <span style={{ color: colors.accent }}>{homeDemoHero.titleAccent}</span>
            </h1>
            <p style={heroSub}>{homeDemoHero.subtitle}</p>
            <button type="button" onClick={() => goExplore()} style={heroCta}>
              {homeDemoHero.cta} →
            </button>
          </div>
        </section>
        <div aria-hidden="true" style={heroDots}>
          <span style={{ ...dot, background: colors.primary, width: 18 }} />
          <span style={dot} />
          <span style={dot} />
          <span style={dot} />
        </div>

        {/* D — Categories */}
        <Section title="Categorías" onSeeAll={() => goExplore()}>
          <div style={catRow}>
            {homeDemoCategories.map((category) => (
              <button key={category.id} type="button" onClick={() => goExplore(category.name)} aria-label={category.name} style={catItem}>
                <Image
                  src={category.image}
                  alt=""
                  width={72}
                  height={72}
                  unoptimized
                  style={{ borderRadius: 14, display: "block", height: 68, margin: "0 auto 6px", objectFit: "cover", width: 68 }}
                />
                <span style={catLabel}>{category.name}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* E — Featured products (DEMO mock) */}
        <Section title="Productos destacados" seeAllLabel="Ver todos" onSeeAll={() => goExplore()}>
          <div style={productRow}>
            {homeDemoFeaturedProducts.map((product) => (
              <article key={product.id} style={productCard}>
                <div style={productPhoto}>
                  {product.discountPercent ? <span style={discountBadge}>-{product.discountPercent}%</span> : null}
                  <button type="button" aria-label="Favorito" style={favHit}>
                    <IconHeart />
                  </button>
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={160}
                    height={160}
                    unoptimized
                    style={{ height: "100%", objectFit: "contain", width: "100%" }}
                  />
                </div>
                <p style={productName}>{product.name}</p>
                <div style={priceRow}>
                  <span style={productPrice}>{formatDemoPrice(product.price)}</span>
                  {product.compareAtPrice ? <span style={comparePrice}>{formatDemoPrice(product.compareAtPrice)}</span> : null}
                </div>
                <div style={ratingRow} aria-label={`${product.rating} estrellas, ${product.reviewCount} reseñas`}>
                  <Stars value={product.rating} />
                  <span style={reviewCount}>({product.reviewCount})</span>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* F — Request product */}
        <section aria-label="Solicitar producto" style={requestBanner}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ color: colors.deep, fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>{homeDemoRequest.title}</h2>
            <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.35, margin: "0 0 12px" }}>{homeDemoRequest.subtitle}</p>
            <Link href="/solicitar" style={requestCta}>
              {homeDemoRequest.cta} →
            </Link>
          </div>
          <Image src={homeDemoRequest.art} alt="" width={120} height={90} unoptimized style={{ flexShrink: 0, height: 86, objectFit: "contain", width: 120 }} />
        </section>

        {/* G — Special offers */}
        <Section title="Ofertas especiales" onSeeAll={() => goExplore()}>
          <div style={offerGrid}>
            {homeDemoOffers.map((offer) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => goExplore(offer.exploreQuery)}
                style={{ ...offerCard, background: offer.background }}
              >
                <span style={{ ...offerPercent, background: offer.badgeColor }}>%</span>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <p style={{ ...offerTitle, color: offer.titleColor }}>{offer.title}</p>
                  {offer.subtitle ? <p style={{ ...offerBody, color: offer.titleColor, opacity: 0.85 }}>{offer.subtitle}</p> : null}
                  <span
                    style={{
                      ...offerLinkBtn,
                      background: offer.buttonBackground,
                      color: offer.buttonColor,
                    }}
                  >
                    Ver ofertas →
                  </span>
                </div>
                <Image
                  src={offer.art}
                  alt=""
                  width={90}
                  height={70}
                  unoptimized
                  style={{ bottom: 6, height: 64, objectFit: "contain", position: "absolute", right: 4, width: 88 }}
                />
              </button>
            ))}
          </div>
        </Section>

      </div>
    </PageFrame>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span aria-hidden="true" style={{ color: "#F5A524", fontSize: 12, letterSpacing: 1, lineHeight: 1 }}>
      {"★".repeat(Math.round(value))}
    </span>
  );
}

function Section({
  title,
  onSeeAll,
  seeAllLabel = "Ver todas",
  children,
}: {
  title: string;
  onSeeAll: () => void;
  seeAllLabel?: string;
  children: ReactNode;
}) {
  return (
    <section style={{ display: "grid", gap: 10 }}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ color: colors.deep, fontSize: 17, fontWeight: 800, margin: 0 }}>{title}</h2>
        <button
          type="button"
          onClick={onSeeAll}
          style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", font: "inherit", fontSize: 14, fontWeight: 700 }}
        >
          {seeAllLabel}
        </button>
      </div>
      {children}
    </section>
  );
}

const root: CSSProperties = {
  display: "grid",
  gap: 14,
  margin: "0 auto",
  maxWidth: 430,
  width: "100%",
};

const header: CSSProperties = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  minHeight: 36,
};

const iconHit: CSSProperties = {
  alignItems: "center",
  display: "inline-flex",
  height: 36,
  justifyContent: "center",
  textDecoration: "none",
  width: 36,
};

const badge: CSSProperties = {
  alignItems: "center",
  background: "#E11D48",
  borderRadius: 999,
  color: "#fff",
  display: "inline-flex",
  fontSize: 10,
  fontWeight: 700,
  height: 15,
  justifyContent: "center",
  minWidth: 15,
  padding: "0 3px",
  position: "absolute",
  right: 0,
  top: 0,
};

const offline: CSSProperties = {
  background: "#FEF2F2",
  border: "1px solid #FECACA",
  borderRadius: radiusTokens.md,
  color: "#991B1B",
  cursor: "pointer",
  font: "inherit",
  fontSize: 12,
  fontWeight: 600,
  padding: 10,
  textAlign: "left",
};

const searchShell: CSSProperties = {
  alignItems: "center",
  background: "#F1F4F8",
  border: "1px solid #E4EAF1",
  borderRadius: 14,
  display: "flex",
  gap: 8,
  minHeight: 44,
  padding: "0 14px",
};

const searchInput: CSSProperties = {
  background: "transparent",
  border: "none",
  color: colors.deep,
  flex: 1,
  font: "inherit",
  fontSize: 14,
  minHeight: 42,
  outline: "none",
};

const hero: CSSProperties = {
  borderRadius: 18,
  display: "grid",
  isolation: "isolate",
  minHeight: 168,
  overflow: "hidden",
  padding: "18px 14px 18px 16px",
  position: "relative",
};

const heroScrim: CSSProperties = {
  background: "linear-gradient(90deg, rgba(20,70,170,0.72) 0%, rgba(20,70,170,0.38) 42%, rgba(20,70,170,0.08) 68%, transparent 100%)",
  bottom: 0,
  left: 0,
  position: "absolute",
  right: 0,
  top: 0,
  zIndex: 1,
};

const heroCopy: CSSProperties = { maxWidth: "58%", position: "relative", zIndex: 2 };
const heroTitle: CSSProperties = {
  color: "#fff",
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: 1.2,
  margin: "0 0 6px",
  textShadow: "0 1px 2px rgba(0,40,100,0.35)",
};
const heroSub: CSSProperties = {
  color: "rgba(255,255,255,0.95)",
  fontSize: 12,
  lineHeight: 1.35,
  margin: "0 0 12px",
  textShadow: "0 1px 2px rgba(0,40,100,0.3)",
};
const heroCta: CSSProperties = {
  background: "#fff",
  border: "none",
  borderRadius: 999,
  color: colors.primary,
  cursor: "pointer",
  font: "inherit",
  fontSize: 13,
  fontWeight: 700,
  minHeight: 34,
  padding: "0 12px",
};

const heroDots: CSSProperties = { alignItems: "center", display: "flex", gap: 6, justifyContent: "center", marginTop: -6 };
const dot: CSSProperties = { background: "#D7E0EC", borderRadius: 999, display: "block", height: 7, width: 7 };

const catRow: CSSProperties = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 2,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  WebkitOverflowScrolling: "touch",
};

const catItem: CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  flex: "0 0 72px",
  font: "inherit",
  padding: 0,
  textAlign: "center",
  width: 72,
};

const catLabel: CSSProperties = { color: colors.deep, display: "block", fontSize: 11, fontWeight: 600, lineHeight: 1.2 };

const productRow: CSSProperties = {
  display: "flex",
  gap: 10,
  overflowX: "auto",
  paddingBottom: 4,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  WebkitOverflowScrolling: "touch",
};

const productCard: CSSProperties = {
  background: "#fff",
  border: "1px solid #E8EEF5",
  borderRadius: 14,
  boxShadow: "0 4px 14px rgba(20,36,59,0.06)",
  flex: "0 0 148px",
  padding: 8,
  width: 148,
};

const productPhoto: CSSProperties = {
  aspectRatio: "1",
  background: "#FFFFFF",
  borderRadius: 10,
  marginBottom: 8,
  overflow: "hidden",
  position: "relative",
};

const discountBadge: CSSProperties = {
  background: "#E11D48",
  borderRadius: 6,
  color: "#fff",
  fontSize: 10,
  fontWeight: 700,
  left: 6,
  padding: "2px 6px",
  position: "absolute",
  top: 6,
  zIndex: 1,
};

const favHit: CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  height: 28,
  justifyContent: "center",
  padding: 0,
  position: "absolute",
  right: 2,
  top: 2,
  width: 28,
  zIndex: 1,
};

const productName: CSSProperties = {
  color: colors.deep,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.25,
  margin: "0 0 4px",
};

const priceRow: CSSProperties = { alignItems: "baseline", display: "flex", gap: 6, marginBottom: 4 };
const productPrice: CSSProperties = { color: colors.primary, fontSize: 15, fontWeight: 800 };
const comparePrice: CSSProperties = { color: colors.muted, fontSize: 12, textDecoration: "line-through" };
const ratingRow: CSSProperties = { alignItems: "center", display: "flex", gap: 4 };
const reviewCount: CSSProperties = { color: colors.muted, fontSize: 11 };

const requestBanner: CSSProperties = {
  alignItems: "center",
  background: "linear-gradient(135deg, #EAF3FF 0%, #F5F9FF 100%)",
  borderRadius: 16,
  display: "flex",
  gap: 8,
  overflow: "hidden",
  padding: "14px 12px 14px 16px",
};

const requestCta: CSSProperties = {
  background: "#fff",
  border: `1.5px solid ${colors.primary}`,
  borderRadius: 999,
  color: colors.primary,
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 700,
  minHeight: 32,
  padding: "0 12px",
  alignItems: "center",
  textDecoration: "none",
};

const offerGrid: CSSProperties = { display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" };
const offerCard: CSSProperties = {
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  font: "inherit",
  minHeight: 132,
  overflow: "hidden",
  padding: "12px 10px",
  position: "relative",
  textAlign: "left",
};
const offerPercent: CSSProperties = {
  alignItems: "center",
  borderRadius: 8,
  color: "#fff",
  display: "inline-flex",
  fontSize: 11,
  fontWeight: 800,
  height: 22,
  justifyContent: "center",
  position: "absolute",
  right: 8,
  top: 8,
  width: 22,
  zIndex: 2,
};
const offerTitle: CSSProperties = { fontSize: 13, fontWeight: 800, lineHeight: 1.25, margin: "0 0 4px", maxWidth: "70%" };
const offerBody: CSSProperties = { fontSize: 10, lineHeight: 1.3, margin: "0 0 10px", maxWidth: "68%" };
const offerLinkBtn: CSSProperties = {
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 11,
  fontWeight: 700,
  minHeight: 28,
  padding: "0 10px",
  alignItems: "center",
};
