"use client";

import { listCatalogCategories, listInternalStores, probeServerReachable, type NamedCatalogList } from "@comprausa/api-client";
import { APP_BRAND_NAME } from "@comprausa/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { apiBase } from "../lib/api";
import { PageFrame } from "./page-frame";
import { colors, fontTokens, radiusTokens, spaceTokens } from "./styles";

type DirectoryLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NamedCatalogList };

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
    <PageFrame>
      <div className="cve-fade-up" style={{ display: "grid", gap: spaceTokens[4], maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <header style={{ alignItems: "center", display: "flex", justifyContent: "space-between", minHeight: 44 }}>
          <Link href="/" aria-label={APP_BRAND_NAME} style={{ display: "inline-flex", lineHeight: 0 }}>
            <Image src="/brand/logo-header.webp" alt={APP_BRAND_NAME} width={160} height={40} priority style={{ height: 36, width: "auto" }} />
          </Link>
          <div style={{ display: "flex", gap: spaceTokens[2] }}>
            <Link href="/perfil" aria-label="Favoritos" style={iconLink}>
              ♡
            </Link>
            <Link href="/pedidos" aria-label="Notificaciones" style={{ ...iconLink, position: "relative" }}>
              🔔
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
          <span aria-hidden="true" style={{ color: colors.muted, fontSize: 20 }}>
            ⌕
          </span>
          <input
            aria-label="Buscar productos, marcas, tiendas"
            placeholder="Buscar productos, marcas, tiendas..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: colors.deep,
              flex: 1,
              font: "inherit",
              fontSize: fontTokens.sizes.body,
              minHeight: 44,
              outline: "none",
            }}
          />
        </form>

        <button type="button" onClick={() => goExplore()} aria-label="Miles de productos de USA. Ver ofertas" style={bannerButton}>
          <Image
            src="/brand/home/banner-miles.webp"
            alt=""
            width={1750}
            height={698}
            priority
            style={{ display: "block", height: "auto", width: "100%" }}
          />
        </button>

        <Section title="Tiendas populares" onSeeAll={() => goExplore()}>
          {stores.status === "loading" ? <p style={muted}>Cargando tiendas…</p> : null}
          {stores.status === "error" ? <p style={error}>{stores.message}</p> : null}
          {stores.status === "ready" ? (
            <div
              style={{
                display: "grid",
                gap: spaceTokens[2],
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              }}
            >
              {stores.data.items.map((store) => {
                const logo = storeLogos[store.id];
                return (
                  <button key={store.id} type="button" onClick={() => goExplore(store.name)} aria-label={store.name} style={storeTile}>
                    {logo ? (
                      <Image src={logo} alt="" width={120} height={120} unoptimized style={{ height: "100%", objectFit: "contain", width: "100%" }} />
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{store.name}</span>
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
            <div style={{ display: "flex", gap: spaceTokens[3], overflowX: "auto", paddingBottom: spaceTokens[2] }}>
              {categories.data.items.map((category) => {
                const icon = categoryIcons[category.id];
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => goExplore(category.name)}
                    aria-label={category.name}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      flex: "0 0 76px",
                      font: "inherit",
                      padding: 0,
                      textAlign: "center",
                      width: 76,
                    }}
                  >
                    {icon ? (
                      <Image
                        src={icon}
                        alt=""
                        width={72}
                        height={72}
                        unoptimized
                        style={{ borderRadius: radiusTokens.md, display: "block", height: 72, margin: "0 auto 8px", objectFit: "cover", width: 72 }}
                      />
                    ) : (
                      <span
                        style={{
                          alignItems: "center",
                          background: "#EAF3FF",
                          borderRadius: radiusTokens.md,
                          color: colors.primary,
                          display: "grid",
                          fontWeight: 800,
                          height: 72,
                          margin: "0 auto 8px",
                          placeItems: "center",
                          width: 72,
                        }}
                      >
                        {category.name.slice(0, 1)}
                      </span>
                    )}
                    <span style={{ color: colors.muted, display: "block", fontSize: 12, fontWeight: 600, lineHeight: 1.25 }}>
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </Section>

        <button type="button" onClick={() => goExplore()} aria-label="Descuentos especiales" style={bannerButton}>
          <Image
            src="/brand/home/banner-descuentos.webp"
            alt=""
            width={854}
            height={312}
            style={{ display: "block", height: "auto", width: "100%" }}
          />
        </button>
      </div>
    </PageFrame>
  );
}

function Section({ title, onSeeAll, children }: { title: string; onSeeAll: () => void; children: ReactNode }) {
  return (
    <section>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: spaceTokens[3] }}>
        <h2 style={{ color: colors.deep, fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
        <button
          type="button"
          onClick={onSeeAll}
          style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", font: "inherit", fontWeight: 700 }}
        >
          Ver todas
        </button>
      </div>
      {children}
    </section>
  );
}

const iconLink: CSSProperties = {
  alignItems: "center",
  color: colors.deep,
  display: "inline-flex",
  fontSize: 22,
  height: 40,
  justifyContent: "center",
  textDecoration: "none",
  width: 40,
};

const badge: CSSProperties = {
  alignItems: "center",
  background: "#E11D48",
  borderRadius: 999,
  color: "#fff",
  display: "inline-flex",
  fontSize: 10,
  fontWeight: 700,
  height: 16,
  justifyContent: "center",
  minWidth: 16,
  padding: "0 3px",
  position: "absolute",
  right: 2,
  top: 2,
};

const offlineBanner: CSSProperties = {
  background: "#FEF2F2",
  border: "1px solid #FECACA",
  borderRadius: radiusTokens.md,
  color: "#991B1B",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 600,
  padding: spaceTokens[3],
  textAlign: "left",
};

const searchShell: CSSProperties = {
  alignItems: "center",
  border: "1.5px solid #D7E0EC",
  borderRadius: radiusTokens.lg,
  display: "flex",
  gap: spaceTokens[2],
  minHeight: 48,
  padding: `0 ${spaceTokens[3]}px`,
};

const bannerButton: CSSProperties = {
  background: "transparent",
  border: "none",
  borderRadius: radiusTokens.lg,
  cursor: "pointer",
  display: "block",
  overflow: "hidden",
  padding: 0,
  width: "100%",
};

const storeTile: CSSProperties = {
  alignItems: "center",
  aspectRatio: "1",
  background: "#fff",
  border: "1px solid #E8EEF5",
  borderRadius: radiusTokens.md,
  cursor: "pointer",
  display: "grid",
  justifyContent: "center",
  overflow: "hidden",
  padding: 6,
};

const muted: CSSProperties = { color: colors.muted, margin: 0 };
const error: CSSProperties = { color: "#991B1B", margin: 0 };
