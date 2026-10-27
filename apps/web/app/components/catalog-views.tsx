"use client";

import {
  ApiClientError,
  getCatalogAvailability,
  getCatalogPricing,
  listCatalogCategories,
  listInternalStores,
  searchCatalog,
  type CatalogAvailability,
  type CatalogPricing,
  type CatalogSummary,
  type NamedCatalogList,
} from "@comprausa/api-client";
import { catalogPriceLabel } from "@comprausa/utils";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiBase } from "../lib/api";
import { demoProductCards, referenceStoreCards } from "../lib/demo-catalog";
import { IconSearch } from "./icons";
import {
  badgeStyle,
  bodyStyle,
  buttonStyle,
  cardStyle,
  chipStyle,
  colors,
  errorStyle,
  headingStyle,
  inputStyle,
  linkStyle,
  mutedStyle,
  sectionStyle,
  spaceTokens,
} from "./styles";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

interface ProductCardData {
  item: CatalogSummary;
  pricing: CatalogPricing;
  availability: CatalogAvailability;
  fromFallback?: boolean;
}

export function SearchForm({
  value,
  onChange,
  onSubmit,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  compact?: boolean;
}) {
  function submit(event: FormEvent): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="cve-search-bar"
      style={{ marginTop: compact ? 0 : spaceTokens[4] }}
    >
      <label style={{ display: "grid", gap: spaceTokens[2], position: "relative" }}>
        <span className={compact ? "cve-mobile-only" : undefined}>Buscar</span>
        <span
          aria-hidden="true"
          style={{
            alignItems: "center",
            bottom: 0,
            display: "flex",
            left: spaceTokens[3],
            position: "absolute",
            top: compact ? 0 : 28,
          }}
        >
          <IconSearch />
        </span>
        <input
          style={{ ...inputStyle, paddingLeft: 40 }}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Busca en el catálogo de demostración"
        />
      </label>
      <button type="submit" style={{ ...buttonStyle, minWidth: 112 }}>
        Buscar
      </button>
    </form>
  );
}

export function ProductList({
  query,
  title = "Ofertas destacadas",
  label = "Ofertas destacadas",
}: {
  query: string;
  title?: string;
  label?: string;
}) {
  const load = useLoad(() => loadProducts(query), [query]);
  const usedFallback = load.phase.status === "ready" && load.phase.data.some((card) => card.fromFallback);
  return (
    <section aria-label={label} id="ofertas" style={sectionStyle}>
      <h2 style={headingStyle}>{title}</h2>
      <p style={mutedStyle}>Artículos del catálogo demo. Llevan etiqueta Ficticio y no publican precio.</p>
      {usedFallback ? (
        <p role="status" style={mutedStyle}>
          Mostramos el catálogo demo local porque el API no respondió. Los datos coinciden con internal-demo.
        </p>
      ) : null}
      <AsyncRegion
        load={load}
        empty="Todavía no hay artículos en el catálogo demo."
        onRetry={load.retry}
        render={(cards) =>
          cards.length === 0 ? (
            <p role="status" style={bodyStyle}>
              {query.trim().length > 0
                ? "Ningún artículo del catálogo demo coincide con esa búsqueda."
                : "Todavía no hay artículos en el catálogo demo."}
            </p>
          ) : (
            <ul className="cve-product-grid">
              {cards.map((card) => (
                <li key={card.item.id}>
                  <ProductCard card={card} />
                </li>
              ))}
            </ul>
          )
        }
      />
    </section>
  );
}

export function ReferenceStoreCards() {
  return (
    <section aria-label="Tiendas de referencia" style={sectionStyle}>
      <h2 style={headingStyle}>Tiendas de referencia</h2>
      <p style={mutedStyle}>Tarjetas con el nombre en texto. No usamos logos oficiales ni conectores a esas tiendas.</p>
      <ul className="cve-store-card-grid">
        {referenceStoreCards.map((store) => (
          <li key={store.id}>
            <article style={{ ...cardStyle, height: "100%", minHeight: 140 }}>
              <div
                aria-hidden="true"
                style={{
                  alignItems: "center",
                  background: colors.background,
                  borderRadius: 8,
                  color: colors.primary,
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 800,
                  height: 56,
                  justifyContent: "center",
                }}
              >
                {store.name.slice(0, 1)}
              </div>
              <h3 style={{ ...headingStyle, margin: 0 }}>{store.name}</h3>
              <p style={{ ...mutedStyle, margin: 0 }}>{store.note}</p>
              <Link href="/explorar" style={linkStyle}>
                Buscar en el catálogo demo
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CategoryList() {
  const load = useLoad(() => listCatalogCategories(apiBase), []);
  return (
    <section aria-label="Categorías" id="categorias" style={sectionStyle}>
      <h2 style={headingStyle}>Categorías populares</h2>
      <AsyncRegion
        load={{ ...load, failure: "No pudimos cargar las categorías." }}
        empty="Todavía no hay categorías."
        onRetry={load.retry}
        render={(data) =>
          data.items.length === 0 ? (
            <p role="status" style={bodyStyle}>
              Todavía no hay categorías.
            </p>
          ) : (
            <ul className="cve-category-row">
              {data.items.map((item, index) => (
                <li key={item.id} className="cve-chip-in" style={{ animationDelay: `${index * 40}ms` }}>
                  <Link
                    href={`/explorar?text=${encodeURIComponent(item.name)}`}
                    style={{
                      alignItems: "center",
                      color: colors.text,
                      display: "grid",
                      gap: spaceTokens[2],
                      justifyItems: "center",
                      textDecoration: "none",
                      width: 88,
                    }}
                  >
                    <span
                      style={{
                        alignItems: "center",
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "50%",
                        color: colors.primary,
                        display: "flex",
                        fontSize: 18,
                        fontWeight: 700,
                        height: 72,
                        justifyContent: "center",
                        width: 72,
                      }}
                    >
                      {item.name.slice(0, 1).toLocaleUpperCase("es")}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center" }}>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      />
    </section>
  );
}

export function StoreList({ title, label }: { title: string; label: string }) {
  const load = useLoad(() => listInternalStores(apiBase), []);
  return (
    <section aria-label={label} style={sectionStyle}>
      <h2 style={headingStyle}>{title}</h2>
      <p style={mutedStyle}>Nombres propios, sin logos de marcas. El conector externo todavía no está activo.</p>
      <AsyncRegion
        load={{ ...load, failure: "No pudimos cargar las tiendas." }}
        empty="Todavía no hay tiendas internas."
        onRetry={load.retry}
        render={(data) =>
          data.items.length === 0 ? (
            <p role="status" style={bodyStyle}>
              Todavía no hay tiendas internas.
            </p>
          ) : (
            <ul className="cve-store-row">
              {data.items.map((item) => (
                <li key={item.id}>
                  <span style={chipStyle}>{item.name}</span>
                </li>
              ))}
            </ul>
          )
        }
      />
    </section>
  );
}

export function FilterSidebar({ query }: { query: string }) {
  return (
    <aside
      aria-label="Filtros"
      style={{
        ...cardStyle,
        alignContent: "start",
        gap: spaceTokens[4],
        height: "fit-content",
        position: "sticky",
        top: 88,
      }}
    >
      <h2 style={{ ...headingStyle, margin: 0 }}>Filtros</h2>
      <div>
        <p style={{ ...headingStyle, marginBottom: spaceTokens[2] }}>Tienda</p>
        <p style={mutedStyle}>Sin conector externo. Solo catálogo demo interno.</p>
      </div>
      <div>
        <p style={{ ...headingStyle, marginBottom: spaceTokens[2] }}>Categoría</p>
        <p style={mutedStyle}>Todavía no hay facetas de categoría en el demo.</p>
      </div>
      <div>
        <p style={{ ...headingStyle, marginBottom: spaceTokens[2] }}>Precio</p>
        <p style={mutedStyle}>Los artículos demo no publican precio.</p>
      </div>
      <div>
        <p style={{ ...headingStyle, marginBottom: spaceTokens[2] }}>Nombre</p>
        <p style={bodyStyle}>{query.trim().length > 0 ? `Buscando: «${query}»` : "Sin texto de búsqueda."}</p>
        <p style={mutedStyle}>El único filtro del catálogo demo es el nombre.</p>
      </div>
    </aside>
  );
}

function ProductCard({ card }: { card: ProductCardData }) {
  return (
    <article style={{ ...cardStyle, height: "100%" }}>
      <div
        aria-hidden="true"
        style={{
          alignItems: "center",
          background: `linear-gradient(160deg, ${colors.background}, ${colors.border})`,
          borderRadius: spaceTokens[2],
          color: colors.muted,
          display: "flex",
          fontSize: 12,
          fontWeight: 600,
          justifyContent: "center",
          minHeight: 140,
        }}
      >
        Sin foto
      </div>
      <p style={{ margin: 0 }}>
        <span style={badgeStyle}>Ficticio</span>
      </p>
      <h3 style={{ ...headingStyle, margin: 0 }}>
        <Link href={`/producto/${card.item.id}`} style={{ color: colors.text, textDecoration: "none" }}>
          {card.item.name}
        </Link>
      </h3>
      <p style={{ ...bodyStyle, fontWeight: 700, margin: 0 }}>{catalogPriceLabel(card.pricing)}</p>
      <p style={{ ...mutedStyle, margin: 0 }}>{card.availability.note}</p>
      <Link href={`/producto/${card.item.id}`} style={{ ...buttonStyle, alignItems: "center", display: "inline-flex", justifyContent: "center", textDecoration: "none" }}>
        Ver ficha
      </Link>
    </article>
  );
}

function AsyncRegion<T>({
  load,
  empty,
  onRetry,
  render,
}: {
  load: { phase: Load<T>; failure?: string };
  empty: string;
  onRetry: () => void;
  render: (data: T) => ReactNode;
}) {
  if (load.phase.status === "loading") {
    return (
      <p aria-busy="true" style={bodyStyle}>
        Cargando…
      </p>
    );
  }
  if (load.phase.status === "error") {
    return (
      <div>
        <p role="alert" style={errorStyle}>
          {load.failure ?? "No pudimos cargar el catálogo."}
        </p>
        <button type="button" style={buttonStyle} onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }
  if (isEmptyPayload(load.phase.data)) {
    return (
      <p role="status" style={bodyStyle}>
        {empty}
      </p>
    );
  }
  return render(load.phase.data);
}

function isEmptyPayload(_data: unknown): boolean {
  return false;
}

function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]): { phase: Load<T>; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Load<T>>({ status: "loading" });
  const key = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;
    setPhase({ status: "loading" });
    load()
      .then((data) => {
        if (!cancelled) {
          setPhase({ status: "ready", data });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          if (error instanceof ApiClientError || error instanceof Error) {
            setPhase({ status: "error" });
          } else {
            setPhase({ status: "error" });
          }
        }
      });
    return () => {
      cancelled = true;
    };
    // load identity changes with the caller; key tracks the declared inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, key]);

  return { phase, retry: () => setAttempt((current) => current + 1) };
}

async function loadProducts(query: string): Promise<ProductCardData[]> {
  try {
    const result = await searchCatalog(apiBase, query);
    if (result.items.length === 0) {
      return demoProductCards(query);
    }
    return Promise.all(
      result.items.map(async (item) => {
        const [pricing, availability] = await Promise.all([
          getCatalogPricing(apiBase, item.id),
          getCatalogAvailability(apiBase, item.id),
        ]);
        return { item, pricing, availability };
      }),
    );
  } catch {
    return demoProductCards(query);
  }
}

// Keep NamedCatalogList import used for typing clarity in StoreList/CategoryList paths.
export type { NamedCatalogList };
