"use client";

import { listCatalogCategories, listInternalStores, probeServerReachable, type NamedCatalogList } from "@comprausa/api-client";
import { APP_BRAND_NAME } from "@comprausa/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { apiBase } from "../lib/api";
import { IconBell, IconHeart, IconSearch } from "./icons";
import { PageFrame } from "./page-frame";
import { colors, fontTokens, radiusTokens, spaceTokens } from "./styles";

type DirectoryLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NamedCatalogList };

/** First-row categories matching the approved TraeLo Home mock. */
const HOME_CATEGORY_IDS = ["electronica", "ropa", "calzado", "hogar"] as const;

const storeLogos: Record<string, string> = {
  amazon: "/brand/home/store-amazon.webp",
  walmart: "/brand/home/store-walmart.webp",
  ebay: "/brand/home/store-ebay.webp",
  shein: "/brand/home/store-shein.webp",
  nike: "/brand/home/store-nike.webp",
  "best-buy": "/brand/home/store-bestbuy.webp",
  target: "/brand/home/store-target.webp",
  apple: "/brand/home/store-apple.webp",
};

const categoryIcons: Record<string, string> = {
  electronica: "/brand/home/cat-electronica.webp",
  ropa: "/brand/home/cat-ropa.webp",
  calzado: "/brand/home/cat-calzado.webp",
  hogar: "/brand/home/cat-hogar.webp",
  belleza: "/brand/home/cat-belleza.webp",
  deportes: "/brand/home/cat-deportes.webp",
  juguetes: "/brand/home/cat-juguetes.webp",
  supermercado: "/brand/home/cat-supermercado.webp",
  videojuegos: "/brand/home/cat-videojuegos.webp",
  herramientas: "/brand/home/cat-herramientas.webp",
};

/**
 * TraeLo Home — mobile-first Next.js surface matching the approved mock.
 * Stores/categories come from /v1/catalog; no invented prices.
 */
export function HomeScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [stores, setStores] = useState<DirectoryLoad>({ status: "loading" });
  const [categories, setCategories] = useState<DirectoryLoad>({ status: "loading" });

  const refresh = useCallback(async () => {
    setStores({ status: "loading" });
    setCategories({ status: "loading" });
    const ok = await probeServerReachable(apiBase);
    setReachable(ok);
    if (!ok) {
      setStores({ status: "error", message: "Sin conexión con el servidor." });
      setCategories({ status: "error", message: "Sin conexión con el servidor." });
      return;
    }
    try {
      const [storeList, categoryList] = await Promise.all([listInternalStores(apiBase), listCatalogCategories(apiBase)]);
      setStores({ status: "ready", data: storeList });
      setCategories({ status: "ready", data: categoryList });
    } catch {
      setStores({ status: "error", message: "No pudimos cargar las tiendas." });
      setCategories({ status: "error", message: "No pudimos cargar las categorías." });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const homeCategories = useMemo(() => {
    if (categories.status !== "ready") {
      return [];
    }
    const byId = new Map(categories.data.items.map((item) => [item.id, item]));
    return HOME_CATEGORY_IDS.map((id) => byId.get(id)).filter((item): item is { id: string; name: string } => Boolean(item));
  }, [categories]);

  function goExplore(query?: string): void {
    if (reachable !== true) {
      window.alert("Sin conexión con el servidor. Revisa la red e inténtalo de nuevo.");
      void refresh();
      return;
    }
    const text = query?.trim() ?? "";
    router.push(text.length > 0 ? `/explorar?text=${encodeURIComponent(text)}` : "/explorar");
  }

  return (
    <PageFrame compact>
      <div className="cve-fade-up cve-home" style={homeRoot}>
        <header style={header}>
          <Link href="/" aria-label={APP_BRAND_NAME} style={{ display: "inline-flex", lineHeight: 0 }}>
            <Image
              src="/brand/logo-header.webp"
              alt={APP_BRAND_NAME}
              width={132}
              height={32}
              priority
              style={{ height: 28, width: "auto" }}
            />
          </Link>
          <div style={{ alignItems: "center", display: "flex", gap: 4 }}>
            <Link href="/perfil" aria-label="Favoritos" style={iconHit}>
              <IconHeart />
            </Link>
            <Link href="/pedidos" aria-label="Notificaciones" style={{ ...iconHit, position: "relative" }}>
              <IconBell />
              <span style={badge}>0</span>
            </Link>
          </div>
        </header>

        {reachable === false ? (
          <button type="button" onClick={() => void refresh()} style={offlineBanner}>
            Sin conexión con el servidor. Toca para reintentar.
          </button>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            goExplore(draft);
          }}
          style={searchShell}
        >
          <IconSearch />
          <input
            aria-label="Buscar productos, marcas, tiendas"
            placeholder="Buscar productos, marcas, tiendas..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            style={searchInput}
          />
        </form>

        <button type="button" onClick={() => goExplore()} aria-label="Miles de productos de USA. Ver ofertas" style={bannerButton}>
          <Image
            src="/brand/home/banner-miles.webp"
            alt=""
            width={1750}
            height={698}
            priority
            sizes="(max-width: 480px) 100vw, 480px"
            style={{ display: "block", height: "auto", width: "100%" }}
          />
        </button>

        <Section title="Tiendas populares" onSeeAll={() => goExplore()}>
          {stores.status === "loading" ? <p style={muted}>Cargando tiendas…</p> : null}
          {stores.status === "error" ? <p style={error}>{stores.message}</p> : null}
          {stores.status === "ready" ? (
            <div style={storeGrid}>
              {stores.data.items.slice(0, 8).map((store) => {
                const logo = storeLogos[store.id];
                return (
                  <button key={store.id} type="button" onClick={() => goExplore(store.name)} aria-label={store.name} style={storeTile}>
                    {logo ? (
                      <Image src={logo} alt="" width={96} height={96} unoptimized style={{ height: "78%", objectFit: "contain", width: "78%" }} />
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{store.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}
        </Section>

        <Section title="Categorías" onSeeAll={() => goExplore()}>
          {categories.status === "loading" ? <p style={muted}>Cargando categorías…</p> : null}
          {categories.status === "error" ? <p style={error}>{categories.message}</p> : null}
          {categories.status === "ready" ? (
            <div style={catGrid}>
              {homeCategories.map((category) => {
                const icon = categoryIcons[category.id];
                return (
                  <button key={category.id} type="button" onClick={() => goExplore(category.name)} aria-label={category.name} style={catItem}>
                    {icon ? (
                      <Image
                        src={icon}
                        alt=""
                        width={80}
                        height={80}
                        unoptimized
                        style={{ borderRadius: 14, display: "block", height: "auto", margin: "0 auto 6px", objectFit: "cover", width: "100%" }}
                      />
                    ) : (
                      <span style={catFallback}>{category.name.slice(0, 1)}</span>
                    )}
                    <span style={catLabel}>{category.name}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </Section>

        <button type="button" onClick={() => goExplore()} aria-label="Descuentos especiales" style={{ ...bannerButton, marginTop: 4 }}>
          <Image
            src="/brand/home/banner-descuentos.webp"
            alt=""
            width={854}
            height={312}
            sizes="(max-width: 480px) 100vw, 480px"
            style={{ display: "block", height: "auto", maxHeight: 118, objectFit: "cover", objectPosition: "center", width: "100%" }}
          />
        </button>
      </div>
    </PageFrame>
  );
}

function Section({ title, onSeeAll, children }: { title: string; onSeeAll: () => void; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 10 }}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ color: colors.deep, fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>{title}</h2>
        <button
          type="button"
          onClick={onSeeAll}
          style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", font: "inherit", fontSize: 14, fontWeight: 700 }}
        >
          Ver todas
        </button>
      </div>
      {children}
    </section>
  );
}

const homeRoot: CSSProperties = {
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

const offlineBanner: CSSProperties = {
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

const bannerButton: CSSProperties = {
  background: "transparent",
  border: "none",
  borderRadius: 16,
  cursor: "pointer",
  display: "block",
  lineHeight: 0,
  overflow: "hidden",
  padding: 0,
  width: "100%",
};

const storeGrid: CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
};

const storeTile: CSSProperties = {
  alignItems: "center",
  aspectRatio: "1",
  background: "#fff",
  border: "1px solid #E8EEF5",
  borderRadius: 12,
  cursor: "pointer",
  display: "grid",
  justifyContent: "center",
  overflow: "hidden",
  padding: 4,
};

const catGrid: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
};

const catItem: CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  font: "inherit",
  padding: 0,
  textAlign: "center",
};

const catFallback: CSSProperties = {
  alignItems: "center",
  aspectRatio: "1",
  background: "#EAF3FF",
  borderRadius: 14,
  color: colors.primary,
  display: "grid",
  fontWeight: 800,
  margin: "0 auto 6px",
  placeItems: "center",
  width: "100%",
};

const catLabel: CSSProperties = {
  color: colors.muted,
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.25,
};

const muted: CSSProperties = { color: colors.muted, fontSize: fontTokens.sizes.caption, margin: 0 };
const error: CSSProperties = { color: "#991B1B", fontSize: fontTokens.sizes.caption, margin: 0 };
