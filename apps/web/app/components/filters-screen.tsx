"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { useDemoCommerce } from "../lib/demo-commerce";
import {
  DEMO_PRICE_BOUNDS,
  defaultDemoFilters,
  type DemoFilterState,
  type DemoProductCategory,
  type DemoSortOption,
} from "../lib/products.mock";
import { PageFrame } from "./page-frame";
import { colors, radiusTokens } from "./styles";

const FILTER_CATEGORIES: DemoProductCategory[] = [
  "Tecnología",
  "Moda",
  "Calzado",
  "Hogar",
  "Belleza",
  "Deportes",
];

const SORT_OPTIONS: { id: DemoSortOption; label: string }[] = [
  { id: "relevancia", label: "Relevancia" },
  { id: "precio-asc", label: "Precio: menor a mayor" },
  { id: "precio-desc", label: "Precio: mayor a menor" },
  { id: "rating", label: "Mejor valorados" },
];

/**
 * DEMO filters panel for Explorar. Selections persist via demo commerce store (localStorage).
 * No brand filters / no backend.
 */
export function FiltersScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const text = params.get("text") ?? "";
  const { exploreFilters, setExploreFilters, resetExploreFilters } = useDemoCommerce();
  const [draft, setDraft] = useState<DemoFilterState>(exploreFilters);

  function toggleCategory(name: DemoProductCategory): void {
    setDraft((current) => {
      const has = current.categories.includes(name);
      return {
        ...current,
        categories: has ? current.categories.filter((c) => c !== name) : [...current.categories, name],
      };
    });
  }

  function apply(): void {
    setExploreFilters({
      ...draft,
      minPrice: clampPrice(draft.minPrice),
      maxPrice: clampPrice(draft.maxPrice),
    });
    const qs = text.trim() ? `?text=${encodeURIComponent(text.trim())}` : "";
    router.push(`/explorar${qs}`);
  }

  function reset(): void {
    setDraft(defaultDemoFilters);
    resetExploreFilters();
  }

  return (
    <PageFrame compact>
      <div style={root}>
        <header style={header}>
          <button type="button" onClick={() => router.back()} style={backBtn} aria-label="Volver">
            ←
          </button>
          <h1 style={title}>Filtros</h1>
          <span style={{ width: 36 }} />
        </header>

        <section style={card}>
          <h2 style={heading}>Categorías</h2>
          <div style={chipWrap}>
            {FILTER_CATEGORIES.map((name) => {
              const selected = draft.categories.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleCategory(name)}
                  style={{
                    ...chip,
                    background: selected ? colors.primary : "#FFFFFF",
                    borderColor: selected ? colors.primary : "#D7E0EC",
                    color: selected ? "#FFFFFF" : colors.deep,
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </section>

        <section style={card}>
          <h2 style={heading}>Precio</h2>
          <div style={priceRow}>
            <label style={field}>
              <span style={label}>Mínimo</span>
              <input
                type="number"
                min={DEMO_PRICE_BOUNDS.min}
                max={DEMO_PRICE_BOUNDS.max}
                value={draft.minPrice}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, minPrice: Number(event.target.value) || 0 }))
                }
                style={input}
              />
            </label>
            <label style={field}>
              <span style={label}>Máximo</span>
              <input
                type="number"
                min={DEMO_PRICE_BOUNDS.min}
                max={DEMO_PRICE_BOUNDS.max}
                value={draft.maxPrice}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, maxPrice: Number(event.target.value) || 0 }))
                }
                style={input}
              />
            </label>
          </div>
          <input
            type="range"
            aria-label="Precio máximo"
            min={DEMO_PRICE_BOUNDS.min}
            max={DEMO_PRICE_BOUNDS.max}
            step={5}
            value={draft.maxPrice}
            onChange={(event) =>
              setDraft((current) => ({ ...current, maxPrice: Number(event.target.value) }))
            }
            style={{ accentColor: colors.primary, marginTop: 12, width: "100%" }}
          />
        </section>

        <section style={card}>
          <h2 style={heading}>Ordenar por</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {SORT_OPTIONS.map((option) => {
              const selected = draft.sort === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, sort: option.id }))}
                  style={{
                    ...sortBtn,
                    borderColor: selected ? colors.primary : "#E4EAF1",
                    background: selected ? "#EAF3FF" : "#FFFFFF",
                    color: selected ? colors.primary : colors.deep,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <div style={actions}>
          <button type="button" onClick={reset} style={secondary}>
            Restablecer
          </button>
          <button type="button" onClick={apply} style={primary}>
            Aplicar filtros
          </button>
        </div>
      </div>
    </PageFrame>
  );
}

function clampPrice(value: number): number {
  return Math.min(DEMO_PRICE_BOUNDS.max, Math.max(DEMO_PRICE_BOUNDS.min, value));
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

const backBtn: CSSProperties = {
  alignItems: "center",
  background: "transparent",
  border: "none",
  color: colors.deep,
  cursor: "pointer",
  display: "inline-flex",
  font: "inherit",
  fontSize: 22,
  height: 36,
  justifyContent: "center",
  width: 36,
};

const title: CSSProperties = {
  color: colors.deep,
  fontSize: 20,
  fontWeight: 800,
  margin: 0,
};

const card: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E8EEF5",
  borderRadius: radiusTokens.md,
  boxShadow: "0 4px 14px rgba(20,36,59,0.05)",
  padding: 14,
};

const heading: CSSProperties = {
  color: colors.deep,
  fontSize: 15,
  fontWeight: 800,
  margin: "0 0 12px",
};

const chipWrap: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };

const chip: CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  cursor: "pointer",
  font: "inherit",
  fontSize: 13,
  fontWeight: 700,
  minHeight: 34,
  padding: "0 14px",
};

const priceRow: CSSProperties = { display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" };
const field: CSSProperties = { display: "grid", gap: 6 };
const label: CSSProperties = { color: colors.muted, fontSize: 12, fontWeight: 600 };
const input: CSSProperties = {
  background: "#F7FAFD",
  border: "1px solid #E4EAF1",
  borderRadius: 10,
  color: colors.deep,
  font: "inherit",
  minHeight: 42,
  padding: "0 12px",
  width: "100%",
};

const sortBtn: CSSProperties = {
  border: "1px solid",
  borderRadius: 12,
  cursor: "pointer",
  font: "inherit",
  fontSize: 14,
  fontWeight: 600,
  minHeight: 44,
  padding: "0 14px",
  textAlign: "left",
};

const actions: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "1fr 1fr",
  marginTop: 4,
};

const secondary: CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  color: colors.deep,
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
  minHeight: 46,
};

const primary: CSSProperties = {
  background: colors.primary,
  border: "none",
  borderRadius: 12,
  color: "#FFFFFF",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
  minHeight: 46,
};
