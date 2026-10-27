"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { referenceStoreCards } from "../lib/demo-catalog";
import { popularCategoryLabels } from "../lib/demo-chrome";
import { SearchForm } from "./catalog-views";
import { PageFrame } from "./page-frame";
import {
  bodyStyle,
  buttonStyle,
  cardStyle,
  chipStyle,
  colors,
  headingStyle,
  mutedStyle,
  spaceTokens,
  titleStyle,
} from "./styles";

export function StoresScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  return (
    <PageFrame>
      <h1 style={titleStyle}>Tiendas</h1>
      <p style={mutedStyle}>
        Lista de demostración con nombres en texto. Sin logos oficiales ni conectores a esas marcas.
      </p>
      <SearchForm
        value={draft}
        onChange={setDraft}
        onSubmit={() => {
          const text = draft.trim();
          router.push(text.length > 0 ? `/explorar?text=${encodeURIComponent(text)}` : "/explorar");
        }}
      />

      <section style={{ marginTop: spaceTokens[6] }} aria-label="Categorías">
        <div style={{ alignItems: "baseline", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={headingStyle}>Categorías</h2>
          <Link href="/filtros" style={{ color: colors.primary, fontSize: 14, fontWeight: 600 }}>
            Filtros
          </Link>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {popularCategoryLabels.map((name) => (
            <Link key={name} href={`/explorar?text=${encodeURIComponent(name)}`} style={chipStyle}>
              {name}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: spaceTokens[6] }} aria-label="Tiendas de referencia">
        <h2 style={headingStyle}>Tiendas de referencia</h2>
        <ul className="cve-store-card-grid">
          {referenceStoreCards.map((store) => (
            <li key={store.id}>
              <article style={{ ...cardStyle, height: "100%" }}>
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
                    height: 48,
                    justifyContent: "center",
                  }}
                >
                  {store.name.slice(0, 1)}
                </div>
                <h3 style={{ ...headingStyle, margin: 0 }}>{store.name}</h3>
                <p style={{ ...mutedStyle, margin: 0 }}>{store.note}</p>
                <Link
                  href={`/explorar?text=${encodeURIComponent(store.name)}`}
                  style={{ ...buttonStyle, alignItems: "center", display: "inline-flex", justifyContent: "center", textDecoration: "none" }}
                >
                  Ver catálogo demo
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <p style={{ ...bodyStyle, marginTop: spaceTokens[6] }}>
        Los productos del catálogo demo llevan etiqueta Ficticio. Los precios de maqueta, si aparecen, dicen que no son reales.
      </p>
    </PageFrame>
  );
}
