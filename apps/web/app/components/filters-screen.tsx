"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { partnerStoreNames, popularCategoryLabels } from "../lib/demo-chrome";
import { PageFrame } from "./page-frame";
import {
  bodyStyle,
  buttonStyle,
  cardStyle,
  chipStyle,
  colors,
  headingStyle,
  inputStyle,
  mutedStyle,
  spaceTokens,
  titleStyle,
} from "./styles";

export function FiltersScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("text") ?? "";
  const [text, setText] = useState(initial);
  const [store, setStore] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  function apply(): void {
    const parts = [text.trim(), store ?? "", category ?? ""].filter((part) => part.length > 0);
    const query = parts[0] ?? "";
    router.push(query.length > 0 ? `/explorar?text=${encodeURIComponent(query)}` : "/explorar");
  }

  return (
    <PageFrame>
      <h1 style={titleStyle}>Filtros</h1>
      <p style={mutedStyle}>
        Pantalla móvil de la maqueta. El catálogo demo solo filtra por nombre; tienda y categoría son guía visual.
      </p>

      <section style={cardStyle}>
        <h2 style={headingStyle}>Nombre</h2>
        <label style={{ display: "grid", gap: 8 }}>
          Buscar
          <input
            style={inputStyle}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Ej. Caja de demostración"
          />
        </label>
      </section>

      <section style={{ ...cardStyle, marginTop: spaceTokens[4] }}>
        <h2 style={headingStyle}>Tienda (texto)</h2>
        <p style={mutedStyle}>Sin logos. Solo referencia.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {partnerStoreNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setStore((current) => (current === name ? null : name))}
              style={{
                ...chipStyle,
                background: store === name ? colors.primary : colors.surface,
                borderColor: store === name ? colors.primary : colors.border,
                color: store === name ? colors.primaryOn : colors.text,
                cursor: "pointer",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <section style={{ ...cardStyle, marginTop: spaceTokens[4] }}>
        <h2 style={headingStyle}>Categoría</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {popularCategoryLabels.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory((current) => (current === name ? null : name))}
              style={{
                ...chipStyle,
                background: category === name ? colors.primary : colors.surface,
                borderColor: category === name ? colors.primary : colors.border,
                color: category === name ? colors.primaryOn : colors.text,
                cursor: "pointer",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <section style={{ ...cardStyle, marginTop: spaceTokens[4] }}>
        <h2 style={headingStyle}>Precio</h2>
        <p style={bodyStyle}>Los artículos demo no publican precio real.</p>
        <p style={mutedStyle}>Si ves un monto de maqueta, está marcado como no real. Si no hay dato: «Precio por cotización».</p>
      </section>

      <div style={{ display: "flex", flexWrap: "wrap", gap: spaceTokens[3], marginTop: spaceTokens[6] }}>
        <button type="button" style={buttonStyle} onClick={apply}>
          Aplicar
        </button>
        <Link href="/explorar" style={{ ...buttonStyle, alignItems: "center", background: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, display: "inline-flex", textDecoration: "none" }}>
          Ver catálogo
        </Link>
      </div>
    </PageFrame>
  );
}
