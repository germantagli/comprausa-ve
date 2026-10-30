"use client";

import { getCart, listCatalogCategories, probeServerReachable, type NamedCatalogList } from "@comprausa/api-client";
import { APP_BRAND_NAME, homeFeaturedCategories } from "@comprausa/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { apiBase } from "../lib/api";
import { loadHomeFeaturedProducts, type HomeFeaturedProduct } from "../lib/home-catalog";
import { readSession } from "../lib/session";
import { IconBell, IconHeart, IconSearch } from "./icons";
import { PageFrame } from "./page-frame";
import { colors, fontTokens, radiusTokens } from "./styles";

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

const categoryIcons: Record<string, string> = {
  electronica: "/brand/home/cat-electronica.webp",
  ropa: "/brand/home/cat-ropa.webp",
  calzado: "/brand/home/cat-calzado.webp",
  hogar: "/brand/home/cat-hogar.webp",
  belleza: "/brand/home/cat-belleza.webp",
  deportes: "/brand/home/cat-deportes.webp",
};

/**
 * TraeLo Home — own catalog (no partner store logos).
 * Products/pricing from /v1/catalog; never invents commercial prices or ratings.
 */
export function HomeScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Load<NamedCatalogList>>({ status: "loading" });
  const [featured, setFeatured] = useState<Load<HomeFeaturedProduct[]>>({ status: "loading" });
  const [cartCount, setCartCount] = useState(0);

  const refresh = useCallback(async () => {
    setCategories({ status: "loading" });
    setFeatured({ status: "loading" });
    const ok = await probeServerReachable(apiBase);
    setReachable(ok);
    if (!ok) {
      setCategories({ status: "error", message: "Sin conexión con el servidor." });
      setFeatured({ status: "error", message: "Sin conexión con el servidor." });
      return;
    }
    try {
      const [categoryList, products] = await Promise.all([
        listCatalogCategories(apiBase),
        loadHomeFeaturedProducts(apiBase),
      ]);
      setCategories({ status: "ready", data: categoryList });
      setFeatured({ status: "ready", data: products });
    } catch {
      setCategories({ status: "error", message: "No pudimos cargar el catálogo." });
      setFeatured({ status: "error", message: "No pudimos cargar productos destacados." });
    }
    const session = readSession();
    if (session?.accessToken) {
      try {
        const cart = await getCart(apiBase, session.accessToken);
        setCartCount(cart.groups.reduce((sum, group) => sum + group.items.reduce((inner, item) => inner + item.quantity, 0), 0));
      } catch {
        setCartCount(0);
      }
    } else {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Home labels follow the mock (Tecnología, Moda, …). API confirms category ids exist.
  const homeCategories = useMemo(() => {
    const apiIds =
      categories.status === "ready" ? new Set(categories.data.items.map((item) => item.id)) : null;
    return homeFeaturedCategories
      .filter((item) => apiIds === null || apiIds.has(item.id))
      .map((item) => ({ id: item.id, name: item.name }));
  }, [categories]);

  function requireServer(action: () => void): void {
    if (reachable !== true) {
      window.alert("Sin conexión con el servidor. Revisa la red e inténtalo de nuevo.");
      void refresh();
      return;
    }
    action();
  }

  function goExplore(query?: string): void {
    requireServer(() => {
      const text = query?.trim() ?? "";
      router.push(text.length > 0 ? `/explorar?text=${encodeURIComponent(text)}` : "/explorar");
    });
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
            </Link>
          </div>
        </header>

        {reachable === false ? (
          <button type="button" onClick={() => void refresh()} style={offline}>
            Sin conexión con el servidor. Toca para reintentar.
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

        {/* C — Hero (real text + CTA; art is decorative only) */}
        <section aria-label="Banner principal" style={hero}>
          <div style={heroCopy}>
            <h1 style={heroTitle}>
              Tus compras de USA, directo a <span style={{ color: colors.accent }}>Venezuela</span>
            </h1>
            <p style={heroSub}>Miles de productos seleccionados para ti, con envío seguro.</p>
            <button type="button" onClick={() => goExplore()} style={heroCta}>
              Comprar ahora →
            </button>
          </div>
          <Image
            src="/brand/home/hero-art.webp"
            alt=""
            width={443}
            height={250}
            priority
            style={{ height: "auto", maxWidth: "42%", objectFit: "contain", width: "42%" }}
          />
        </section>
        <div aria-hidden="true" style={heroDots}>
          <span style={{ ...dot, background: colors.primary, width: 18 }} />
          <span style={dot} />
          <span style={dot} />
          <span style={dot} />
        </div>

        {/* D — Categories */}
        <Section title="Categorías" onSeeAll={() => goExplore()}>
          {categories.status === "loading" ? <p style={muted}>Cargando categorías…</p> : null}
          {categories.status === "error" ? <p style={error}>{categories.message}</p> : null}
          <div style={catRow}>
            {homeCategories.map((category) => {
              const icon = categoryIcons[category.id];
              return (
                <button key={category.id} type="button" onClick={() => goExplore(category.name)} aria-label={category.name} style={catItem}>
                  {icon ? (
                    <Image
                      src={icon}
                      alt=""
                      width={72}
                      height={72}
                      unoptimized
                      style={{ borderRadius: 14, display: "block", height: 68, margin: "0 auto 6px", objectFit: "cover", width: 68 }}
                    />
                  ) : (
                    <span style={catFallback}>{category.name.slice(0, 1)}</span>
                  )}
                  <span style={catLabel}>{category.name}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* E — Featured products from API */}
        <Section title="Productos destacados" seeAllLabel="Ver todos" onSeeAll={() => goExplore()}>
          {featured.status === "loading" ? <p style={muted}>Cargando productos…</p> : null}
          {featured.status === "error" ? <p style={error}>{featured.message}</p> : null}
          {featured.status === "ready" && featured.data.length === 0 ? (
            <p style={muted}>Todavía no hay productos en el catálogo de TraeLo.</p>
          ) : null}
          {featured.status === "ready" ? (
            <div style={productRow}>
              {featured.data.map((product) => (
                <Link key={product.id} href={`/producto/${encodeURIComponent(product.id)}`} style={productCard}>
                  <div style={productPhoto}>
                    <span style={demoBadge}>Demo</span>
                    <span style={{ color: colors.muted, fontSize: 12 }}>Sin foto</span>
                  </div>
                  <p style={productName}>{product.name}</p>
                  <p style={productPrice}>{product.priceLabel}</p>
                  <p style={productMeta}>Catálogo demo · sin valoración inventada</p>
                </Link>
              ))}
            </div>
          ) : null}
        </Section>

        {/* F — Request product */}
        <section aria-label="Solicitar producto" style={requestBanner}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ color: colors.deep, fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>¿No encuentras un producto?</h2>
            <p style={{ color: colors.deep, fontSize: 13, lineHeight: 1.35, margin: "0 0 12px", opacity: 0.85 }}>
              Envíanos el enlace y te preparamos una cotización.
            </p>
            <Link href="/solicitar" style={requestCta}>
              Solicitar producto →
            </Link>
          </div>
          <div aria-hidden="true" style={requestArt}>
            🔗
          </div>
        </section>

        {/* G — Special offers (navigation chrome, not invented discounts) */}
        <Section title="Ofertas especiales" onSeeAll={() => goExplore()}>
          <div style={offerGrid}>
            <button type="button" onClick={() => goExplore("Tecnología")} style={{ ...offerCard, background: "#E8F1FF" }}>
              <Image src="/brand/home/cat-electronica.webp" alt="" width={56} height={56} unoptimized style={offerArt} />
              <p style={offerTitle}>Electrónica con descuentos</p>
              <p style={offerBody}>Explora tecnología del catálogo TraeLo.</p>
              <span style={offerLink}>Ver ofertas →</span>
            </button>
            <button type="button" onClick={() => goExplore("Moda")} style={{ ...offerCard, background: "#FDE8F1" }}>
              <Image src="/brand/home/cat-calzado.webp" alt="" width={56} height={56} unoptimized style={offerArt} />
              <p style={offerTitle}>Moda y calzado</p>
              <p style={offerBody}>Las mejores marcas a un mejor precio.</p>
              <span style={{ ...offerLink, color: "#C02670" }}>Ver ofertas →</span>
            </button>
          </div>
        </Section>

        {cartCount > 0 ? (
          <p style={{ ...muted, textAlign: "center" }}>
            Tienes {cartCount} artículo{cartCount === 1 ? "" : "s"} en el{" "}
            <Link href="/carrito" style={{ color: colors.primary, fontWeight: 700 }}>
              carrito
            </Link>
            .
          </p>
        ) : null}
      </div>
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
  gap: 16,
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

const offline: CSSProperties = {
  background: "#FEF2F2",
  border: "1px solid #FECACA",
  borderRadius: radiusTokens.md,
  color: "#991B1B",
  cursor: "pointer",
  font: "inherit",
  fontSize: 13,
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
  minHeight: 46,
  padding: "0 14px",
};

const searchInput: CSSProperties = {
  background: "transparent",
  border: "none",
  color: colors.deep,
  flex: 1,
  font: "inherit",
  fontSize: 15,
  minHeight: 44,
  outline: "none",
};

const hero: CSSProperties = {
  alignItems: "center",
  background: "linear-gradient(135deg, #1B5FC7 0%, #2F7BE8 55%, #4A9AF0 100%)",
  borderRadius: 18,
  display: "flex",
  gap: 8,
  overflow: "hidden",
  padding: "18px 14px 18px 16px",
};

const heroCopy: CSSProperties = { flex: 1, minWidth: 0 };
const heroTitle: CSSProperties = {
  color: "#fff",
  fontSize: 20,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: 1.2,
  margin: "0 0 8px",
};
const heroSub: CSSProperties = { color: "rgba(255,255,255,0.92)", fontSize: 13, lineHeight: 1.35, margin: "0 0 14px" };
const heroCta: CSSProperties = {
  background: "#fff",
  border: "none",
  borderRadius: 999,
  color: colors.primary,
  cursor: "pointer",
  font: "inherit",
  fontSize: 13,
  fontWeight: 700,
  minHeight: 36,
  padding: "0 14px",
};

const heroDots: CSSProperties = { alignItems: "center", display: "flex", gap: 6, justifyContent: "center", marginTop: -4 };
const dot: CSSProperties = { background: "#D7E0EC", borderRadius: 999, display: "block", height: 7, width: 7 };

const catRow: CSSProperties = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 4,
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

const catFallback: CSSProperties = {
  alignItems: "center",
  background: "#EAF3FF",
  borderRadius: 14,
  color: colors.primary,
  display: "grid",
  fontWeight: 800,
  height: 68,
  margin: "0 auto 6px",
  placeItems: "center",
  width: 68,
};

const catLabel: CSSProperties = { color: colors.deep, display: "block", fontSize: 11, fontWeight: 600, lineHeight: 1.2 };

const productRow: CSSProperties = {
  display: "flex",
  gap: 12,
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
  color: "inherit",
  flex: "0 0 148px",
  padding: 10,
  textDecoration: "none",
  width: 148,
};

const productPhoto: CSSProperties = {
  alignItems: "center",
  aspectRatio: "1",
  background: "#F5F8FC",
  borderRadius: 10,
  display: "grid",
  justifyItems: "center",
  marginBottom: 8,
  position: "relative",
};

const demoBadge: CSSProperties = {
  background: "#FEE2E2",
  borderRadius: 6,
  color: "#B91C1C",
  fontSize: 10,
  fontWeight: 700,
  left: 6,
  padding: "2px 6px",
  position: "absolute",
  top: 6,
};

const productName: CSSProperties = {
  color: colors.deep,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.25,
  margin: "0 0 4px",
};

const productPrice: CSSProperties = { color: colors.primary, fontSize: 14, fontWeight: 800, margin: "0 0 2px" };
const productMeta: CSSProperties = { color: colors.muted, fontSize: 11, lineHeight: 1.3, margin: 0 };

const requestBanner: CSSProperties = {
  alignItems: "center",
  background: "linear-gradient(135deg, #EAF3FF 0%, #F5F9FF 100%)",
  borderRadius: 16,
  display: "flex",
  gap: 12,
  padding: 16,
};

const requestCta: CSSProperties = {
  border: `1.5px solid ${colors.primary}`,
  borderRadius: 999,
  color: colors.primary,
  display: "inline-flex",
  fontSize: 13,
  fontWeight: 700,
  minHeight: 34,
  padding: "0 12px",
  alignItems: "center",
  textDecoration: "none",
};

const requestArt: CSSProperties = {
  alignItems: "center",
  background: colors.primary,
  borderRadius: 999,
  color: "#fff",
  display: "grid",
  flexShrink: 0,
  fontSize: 22,
  height: 52,
  placeItems: "center",
  width: 52,
};

const offerGrid: CSSProperties = { display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" };
const offerCard: CSSProperties = {
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  font: "inherit",
  padding: 14,
  position: "relative",
  textAlign: "left",
};
const offerArt: CSSProperties = {
  display: "block",
  height: 48,
  marginBottom: 8,
  objectFit: "contain",
  width: 48,
};
const offerTitle: CSSProperties = { color: colors.deep, fontSize: 14, fontWeight: 800, margin: "0 0 4px" };
const offerBody: CSSProperties = { color: colors.muted, fontSize: 12, lineHeight: 1.3, margin: "0 0 10px" };
const offerLink: CSSProperties = { color: colors.primary, fontSize: 13, fontWeight: 700 };

const muted: CSSProperties = { color: colors.muted, fontSize: fontTokens.sizes.caption, margin: 0 };
const error: CSSProperties = { color: "#991B1B", fontSize: fontTokens.sizes.caption, margin: 0 };
