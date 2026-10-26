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
import { spaceTokens } from "@comprausa/design-tokens";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiBase } from "../lib/api";
import { bodyStyle, buttonStyle, cardStyle, colors, errorStyle, headingStyle, inputStyle, sectionStyle } from "./styles";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

interface ProductCardData {
  item: CatalogSummary;
  pricing: CatalogPricing;
  availability: CatalogAvailability;
}

export function SearchForm({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  function submit(event: FormEvent): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form role="search" onSubmit={submit} style={{ display: "grid", gap: spaceTokens[3], marginTop: spaceTokens[4] }}>
      <label style={{ display: "grid", gap: spaceTokens[2] }}>
        Buscar
        <input
          style={inputStyle}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Busca en el catálogo de demostración"
        />
      </label>
      <button type="submit" style={{ ...buttonStyle, justifySelf: "start" }}>
        Buscar
      </button>
    </form>
  );
}

export function ProductList({ query }: { query: string }) {
  const load = useLoad(
    () => loadProducts(query),
    [query],
  );
  return (
    <section aria-label="Productos del catálogo demo" style={sectionStyle}>
      <h2 style={headingStyle}>Catálogo demo</h2>
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
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
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

export function CategoryList() {
  const load = useLoad(() => listCatalogCategories(apiBase), []);
  return (
    <section aria-label="Categorías" style={sectionStyle}>
      <h2 style={headingStyle}>Categorías</h2>
      <NamedList load={load} empty="Todavía no hay categorías." failure="No pudimos cargar las categorías." />
    </section>
  );
}

export function StoreList({ title, label }: { title: string; label: string }) {
  const load = useLoad(() => listInternalStores(apiBase), []);
  return (
    <section aria-label={label} style={sectionStyle}>
      <h2 style={headingStyle}>{title}</h2>
      <NamedList load={load} empty="Todavía no hay tiendas internas." failure="No pudimos cargar las tiendas." />
    </section>
  );
}

function NamedList({
  load,
  empty,
  failure,
}: {
  load: { phase: Load<NamedCatalogList>; retry: () => void };
  empty: string;
  failure: string;
}) {
  return (
    <AsyncRegion
      load={{ ...load, failure }}
      empty={empty}
      onRetry={load.retry}
      render={(data) =>
        data.items.length === 0 ? (
          <p role="status" style={bodyStyle}>
            {empty}
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: spaceTokens[4] }}>
            {data.items.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        )
      }
    />
  );
}

function ProductCard({ card }: { card: ProductCardData }) {
  return (
    <article style={cardStyle}>
      <p style={{ margin: 0 }}>
        <span
          style={{
            border: `1px solid ${colors.deep}`,
            borderRadius: 8,
            display: "inline-block",
            fontSize: 12,
            lineHeight: "16px",
            padding: `2px ${spaceTokens[2]}px`,
          }}
        >
          Ficticio
        </span>
      </p>
      <h3 style={{ ...headingStyle, margin: 0 }}>{card.item.name}</h3>
      <p style={bodyStyle}>{catalogPriceLabel(card.pricing)}</p>
      <p style={bodyStyle}>{card.availability.note}</p>
      <p style={{ ...bodyStyle, margin: 0 }}>{card.item.disclaimer}</p>
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

function isEmptyPayload(data: unknown): boolean {
  if (Array.isArray(data)) {
    return false;
  }
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
  const result = await searchCatalog(apiBase, query);
  return Promise.all(
    result.items.map(async (item) => {
      const [pricing, availability] = await Promise.all([
        getCatalogPricing(apiBase, item.id),
        getCatalogAvailability(apiBase, item.id),
      ]);
      return { item, pricing, availability };
    }),
  );
}
