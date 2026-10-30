"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useDemoCommerce } from "../lib/demo-commerce";
import {
  DEMO_CATEGORIES,
  demoProducts,
  filterDemoProducts,
  type DemoCategoryChip,
} from "../lib/products.mock";
import { IconBell, IconClose, IconFilter, IconSearch } from "./icons";
import { PageFrame } from "./page-frame";
import { ProductCard } from "./product-card";
import { colors, radiusTokens } from "./styles";

/**
 * TraeLo Explorar — DEMO catalog with search, category chips, filters, favorites, and mock cart.
 * Visual language matches Home (tokens, cards, bottom nav). No live catalog / payments.
 */
export function ExploreScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQuery = params.get("text") ?? "";
  const initialCategory = (params.get("cat") as DemoCategoryChip | null) ?? "Todos";
  const { toast, clearToast, exploreFilters } = useDemoCommerce();

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<DemoCategoryChip>(
    DEMO_CATEGORIES.includes(initialCategory as DemoCategoryChip) ? initialCategory : "Todos",
  );

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (DEMO_CATEGORIES.includes(initialCategory as DemoCategoryChip)) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  const products = useMemo(
    () =>
      filterDemoProducts(demoProducts, {
        query,
        categoryChip: category,
        filters: exploreFilters,
      }),
    [query, category, exploreFilters],
  );

  function selectCategory(next: DemoCategoryChip): void {
    setCategory(next);
    const search = new URLSearchParams();
    if (query.trim()) {
      search.set("text", query.trim());
    }
    if (next !== "Todos") {
      search.set("cat", next);
    }
    const qs = search.toString();
    router.replace(qs ? `/explorar?${qs}` : "/explorar", { scroll: false });
  }

  function clearAll(): void {
    setQuery("");
    setCategory("Todos");
    router.replace("/explorar", { scroll: false });
  }

  return (
    <PageFrame compact>
      <div className="cve-fade-up" style={root}>
        <header style={header}>
          <h1 style={title}>Explorar</h1>
          <Link href="/pedidos" aria-label="Notificaciones" style={{ ...iconHit, position: "relative" }}>
            <IconBell />
            <span style={notifBadge}>1</span>
          </Link>
        </header>

        <div style={searchShell}>
          <IconSearch />
          <input
            aria-label="Buscar productos"
            placeholder="Buscar productos..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={searchInput}
          />
          {query.length > 0 ? (
            <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")} style={clearBtn}>
              <IconClose />
            </button>
          ) : null}
          <Link
            href={`/filtros${query.trim() ? `?text=${encodeURIComponent(query.trim())}` : ""}`}
            aria-label="Abrir filtros"
            style={filterHit}
          >
            <IconFilter />
          </Link>
        </div>

        <div style={chipRow} role="tablist" aria-label="Categorías">
          {DEMO_CATEGORIES.map((chip) => {
            const selected = category === chip;
            return (
              <button
                key={chip}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectCategory(chip)}
                style={{
                  ...chipBtn,
                  background: selected ? colors.primary : "#FFFFFF",
                  borderColor: selected ? colors.primary : "#D7E0EC",
                  color: selected ? "#FFFFFF" : colors.deep,
                }}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {products.length === 0 ? (
          <div style={emptyBox} role="status">
            <p style={emptyText}>No encontramos productos con esa búsqueda.</p>
            <button type="button" onClick={clearAll} style={emptyCta}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="cve-explore-grid" style={grid} aria-label="Catálogo de demostración">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {toast ? (
        <div role="status" aria-live="polite" style={toastStyle} onClick={clearToast}>
          {toast}
        </div>
      ) : null}
    </PageFrame>
  );
}

const root: CSSProperties = {
  display: "grid",
  gap: 14,
  margin: "0 auto",
  maxWidth: 960,
  width: "100%",
};

const header: CSSProperties = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  minHeight: 36,
};

const title: CSSProperties = {
  color: colors.deep,
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  margin: 0,
};

const iconHit: CSSProperties = {
  alignItems: "center",
  display: "inline-flex",
  height: 36,
  justifyContent: "center",
  textDecoration: "none",
  width: 36,
};

const notifBadge: CSSProperties = {
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

const searchShell: CSSProperties = {
  alignItems: "center",
  background: "#F1F4F8",
  border: "1px solid #E4EAF1",
  borderRadius: 14,
  display: "flex",
  gap: 8,
  minHeight: 44,
  padding: "0 10px 0 14px",
};

const searchInput: CSSProperties = {
  background: "transparent",
  border: "none",
  color: colors.deep,
  flex: 1,
  font: "inherit",
  fontSize: 14,
  minHeight: 42,
  minWidth: 0,
  outline: "none",
};

const clearBtn: CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  height: 32,
  justifyContent: "center",
  padding: 0,
  width: 32,
};

const filterHit: CSSProperties = {
  alignItems: "center",
  background: "#FFFFFF",
  border: "1px solid #E4EAF1",
  borderRadius: 10,
  display: "inline-flex",
  height: 34,
  justifyContent: "center",
  textDecoration: "none",
  width: 34,
};

const chipRow: CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  paddingBottom: 2,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  WebkitOverflowScrolling: "touch",
};

const chipBtn: CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  cursor: "pointer",
  flex: "0 0 auto",
  font: "inherit",
  fontSize: 13,
  fontWeight: 700,
  minHeight: 34,
  padding: "0 14px",
  whiteSpace: "nowrap",
};

const grid: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};

const emptyBox: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E8EEF5",
  borderRadius: radiusTokens.md,
  display: "grid",
  gap: 12,
  justifyItems: "center",
  padding: "28px 16px",
  textAlign: "center",
};

const emptyText: CSSProperties = {
  color: colors.deep,
  fontSize: 15,
  fontWeight: 600,
  margin: 0,
};

const emptyCta: CSSProperties = {
  background: colors.primary,
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  font: "inherit",
  fontSize: 14,
  fontWeight: 700,
  minHeight: 40,
  padding: "0 16px",
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
  zIndex: 5,
  whiteSpace: "nowrap",
};
