"use client";

import { listInboxNotifications, probeServerReachable } from "@comprausa/api-client";
import { APP_BRAND_NAME } from "@comprausa/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { apiBase } from "../lib/api";
import { useDemoCommerce } from "../lib/demo-commerce";
import {
  homeDemoCategories,
  homeDemoHero,
  homeDemoOffers,
  homeDemoRequest,
} from "../lib/home.mock";
import { demoProducts } from "../lib/products.mock";
import { readSession } from "../lib/session";
import { IconBell, IconHeart, IconSearch } from "./icons";
import { PageFrame } from "./page-frame";
import { ProductCard } from "./product-card";
import { colors, radiusTokens } from "./styles";

/** First three DEMO catalog items — same source as Explorar. */
const featuredProducts = demoProducts.slice(0, 3);

/**
 * TraeLo Home — DEMO visual presentation matching the approved mock.
 * Featured products/prices/ratings come from home.mock.ts (not inventing live catalog).
 * Navigation stays functional; backend cart probe kept when a session exists.
 */
export function HomeScreen() {
  const router = useRouter();
  const { toast, clearToast } = useDemoCommerce();
  const [draft, setDraft] = useState("");
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refresh = useCallback(async () => {
    setReachable(await probeServerReachable(apiBase));
    const session = readSession();
    if (!session?.accessToken) {
      setUnreadNotifications(0);
      return;
    }
    try {
      const inbox = await listInboxNotifications(apiBase, session.accessToken);
      setUnreadNotifications(inbox.unreadCount);
    } catch {
      /* keep last known count */
    }
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
            <Link href="/notificaciones" aria-label="Notificaciones" style={{ ...iconHit, position: "relative" }}>
              <IconBell />
              {unreadNotifications > 0 ? <span style={badge}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}
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

        {/* E — Featured products (DEMO mock) + Agregar al carrito */}
        <Section title="Productos destacados" seeAllLabel="Ver todos" onSeeAll={() => goExplore()}>
          <div style={productRow}>
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} variant="compact" />
            ))}
          </div>
        </Section>

        {/* F — Request product: 55% text / 45% art, no overlap */}
        <section aria-label="Solicitar producto" style={requestBanner}>
          <div style={requestCopy}>
            <h2 style={{ color: colors.deep, fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>{homeDemoRequest.title}</h2>
            <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.35, margin: "0 0 12px" }}>{homeDemoRequest.subtitle}</p>
            <Link href="/solicitar" style={requestCta}>
              {homeDemoRequest.cta} →
            </Link>
          </div>
          <div style={requestArtWrap}>
            <Image
              src={homeDemoRequest.art}
              alt=""
              width={220}
              height={120}
              unoptimized
              style={requestArt}
            />
          </div>
        </section>

        {/* G — Special offers: text left, products right */}
        <Section title="Ofertas especiales" onSeeAll={() => goExplore()}>
          <div style={offerGrid}>
            {homeDemoOffers.map((offer) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => goExplore(offer.exploreQuery)}
                style={{ ...offerCard, background: offer.background }}
              >
                <div style={offerCopy}>
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
                <div style={offerArtWrap}>
                  <Image src={offer.art} alt="" width={120} height={90} unoptimized style={offerArt} />
                </div>
              </button>
            ))}
          </div>
        </Section>

      </div>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          onClick={clearToast}
          style={{
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
          }}
        >
          {toast}
        </div>
      ) : null}
    </PageFrame>
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

const requestBanner: CSSProperties = {
  alignItems: "center",
  background: "linear-gradient(135deg, #EAF3FF 0%, #F5F9FF 100%)",
  borderRadius: 16,
  display: "flex",
  gap: 12,
  overflow: "hidden",
  padding: "14px 12px 14px 16px",
  position: "relative",
};

const requestCopy: CSSProperties = {
  flex: "1 1 55%",
  maxWidth: "55%",
  minWidth: 0,
  position: "relative",
  zIndex: 2,
};

const requestArtWrap: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flex: "0 0 42%",
  justifyContent: "flex-end",
  maxWidth: "42%",
  minWidth: 96,
  position: "relative",
  zIndex: 1,
};

const requestArt: CSSProperties = {
  height: "auto",
  maxHeight: 88,
  maxWidth: "100%",
  objectFit: "contain",
  objectPosition: "right center",
  width: "100%",
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
  alignItems: "stretch",
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  display: "flex",
  font: "inherit",
  gap: 4,
  minHeight: 132,
  overflow: "hidden",
  padding: "12px 8px 12px 10px",
  position: "relative",
  textAlign: "left",
};
const offerCopy: CSSProperties = {
  display: "flex",
  flex: "1 1 55%",
  flexDirection: "column",
  justifyContent: "center",
  maxWidth: "58%",
  minWidth: 0,
  position: "relative",
  zIndex: 2,
};
const offerArtWrap: CSSProperties = {
  alignItems: "flex-end",
  alignSelf: "center",
  display: "flex",
  flex: "0 0 72px",
  justifyContent: "flex-end",
  maxWidth: 78,
  minWidth: 64,
  pointerEvents: "none",
};
const offerArt: CSSProperties = {
  height: "auto",
  maxHeight: 72,
  maxWidth: "100%",
  objectFit: "contain",
  objectPosition: "right center",
  width: "100%",
};
const offerTitle: CSSProperties = { fontSize: 13, fontWeight: 800, lineHeight: 1.25, margin: "0 0 4px" };
const offerBody: CSSProperties = { fontSize: 10, lineHeight: 1.3, margin: "0 0 10px" };
const offerLinkBtn: CSSProperties = {
  alignItems: "center",
  alignSelf: "flex-start",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 11,
  fontWeight: 700,
  minHeight: 28,
  padding: "0 10px",
};
