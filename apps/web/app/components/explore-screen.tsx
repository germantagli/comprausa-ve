"use client";

import { listCatalogFilters } from "@comprausa/api-client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { partnerStoreNames, popularCategoryLabels } from "../lib/demo-chrome";
import { FilterSidebar, ProductList, SearchForm } from "./catalog-views";
import { PageFrame } from "./page-frame";
import { bodyStyle, buttonStyle, chipStyle, errorStyle, headingStyle, mutedStyle, titleStyle } from "./styles";

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
      .then(() => {
        if (!cancelled) {
          setFilters("ready");
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
      <p style={mutedStyle}>Busca en el catálogo demo. Las tiendas de referencia van en texto, sin logos oficiales.</p>
      <SearchForm value={draft} onChange={setDraft} onSubmit={() => setQuery(draft.trim())} />

      <section id="categorias" style={{ marginTop: 24 }}>
        <h2 style={headingStyle}>Categorías</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {popularCategoryLabels.map((name) => (
            <Link key={name} href={`/explorar?text=${encodeURIComponent(name)}`} style={chipStyle}>
              {name}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={headingStyle}>Tiendas (texto)</h2>
        <div className="cve-store-strip" style={{ marginTop: 8 }}>
          {partnerStoreNames.map((name) => (
            <span key={name} style={chipStyle}>
              {name}
            </span>
          ))}
        </div>
      </section>

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
            {query.trim().length > 0 ? <p style={bodyStyle}>Resultados para «{query}»</p> : null}
            <ProductList query={query} title="Resultados" label="Resultados del catálogo" />
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
