"use client";

import { listCatalogFilters } from "@comprausa/api-client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { CategoryList, FilterSidebar, ProductList, SearchForm, StoreList } from "./catalog-views";
import { PageFrame } from "./page-frame";
import { bodyStyle, buttonStyle, errorStyle, mutedStyle, titleStyle } from "./styles";

export function ExploreScreen() {
  const params = useSearchParams();
  const initial = params.get("text") ?? "";
  const [draft, setDraft] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [filters, setFilters] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setDraft(initial);
    setQuery(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    setFilters("loading");
    listCatalogFilters(apiBase)
      .then((result) => {
        if (!cancelled) {
          setFilters(result.fields.some((field) => field.id === "text") ? "ready" : "ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFilters("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <PageFrame wide>
      <h1 style={titleStyle}>Tiendas y catálogo</h1>
      <p style={mutedStyle}>Busca en el catálogo demo o revisa las tiendas internas. Sin logos de marcas externas.</p>
      <SearchForm value={draft} onChange={setDraft} onSubmit={() => setQuery(draft.trim())} />
      {filters === "loading" ? (
        <p aria-busy="true" style={bodyStyle}>
          Cargando…
        </p>
      ) : null}
      {filters === "error" ? (
        <div>
          <p role="alert" style={errorStyle}>
            No pudimos cargar los filtros.
          </p>
          <button type="button" style={buttonStyle} onClick={() => setAttempt((current) => current + 1)}>
            Reintentar
          </button>
        </div>
      ) : null}
      {filters === "ready" ? (
        <div className="cve-listing-layout" style={{ marginTop: 24 }}>
          <div className="cve-desktop-only">
            <FilterSidebar query={query} />
          </div>
          <div>
            <p className="cve-mobile-only" role="status" style={bodyStyle}>
              El único filtro del catálogo demo es el nombre.
            </p>
            {query.trim().length > 0 ? (
              <p style={bodyStyle}>
                Resultados para «{query}»
              </p>
            ) : null}
            <ProductList query={query} title="Resultados" label="Resultados del catálogo" />
            <CategoryList />
            <StoreList title="Tiendas internas" label="Tiendas internas" />
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
