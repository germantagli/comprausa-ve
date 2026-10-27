"use client";

import { getAccountProfile } from "@comprausa/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { popularCategoryLabels } from "../lib/demo-chrome";
import { readSession } from "../lib/session";
import { ProductList, ReferenceStoreCards, SearchForm } from "./catalog-views";
import { IconBox } from "./icons";
import { PageFrame } from "./page-frame";
import {
  bannerStyle,
  bodyStyle,
  buttonStyle,
  colors,
  displayStyle,
  headingStyle,
  linkStyle,
  mutedStyle,
  secondaryButtonStyle,
  spaceTokens,
  titleStyle,
  wordmarkStyle,
} from "./styles";

export function HomeScreen() {
  const greeting = useGreeting();
  const router = useRouter();
  const [draft, setDraft] = useState("");

  return (
    <PageFrame>
      <div className="cve-mobile-only" style={{ marginBottom: spaceTokens[4] }}>
        <Link href="/" style={wordmarkStyle}>
          CompraUSA
        </Link>
        <h1 style={{ ...titleStyle, marginTop: spaceTokens[3] }}>{greeting}</h1>
        <SearchForm
          value={draft}
          onChange={setDraft}
          onSubmit={() => {
            const text = draft.trim();
            router.push(text.length > 0 ? `/explorar?text=${encodeURIComponent(text)}` : "/explorar");
          }}
        />
      </div>

      <p className="cve-desktop-only" style={{ ...mutedStyle, marginBottom: spaceTokens[3] }}>
        {greeting}. Catálogo de demostración: artículos ficticios, sin precios publicados.
      </p>

      <section aria-label="Compra en USA, recíbelo en Venezuela" className="cve-fade-up" style={{ ...bannerStyle, marginTop: 0 }}>
        <div className="cve-hero">
          <div>
            <p style={{ ...mutedStyle, color: "rgba(255,255,255,0.82)", marginBottom: spaceTokens[2] }}>CompraUSA</p>
            <h2
              className="cve-fade-up-delay"
              style={{
                ...displayStyle,
                color: colors.primaryOn,
                fontSize: "clamp(28px, 3.2vw, 40px)",
                lineHeight: 1.15,
                marginBottom: spaceTokens[3],
              }}
            >
              Compra en tus tiendas favoritas de USA. Recíbelo en Venezuela.
            </h2>
            <ul style={{ listStyle: "none", margin: `0 0 ${spaceTokens[4]}px`, padding: 0 }}>
              {["Productos cotizados por el equipo", "Pagas desde Venezuela cuando el importe esté listo", "Envíos coordinados USA → Venezuela"].map((item) => (
                <li key={item} style={{ alignItems: "center", display: "flex", gap: 10, marginBottom: 8 }}>
                  <span aria-hidden="true" style={{ color: colors.cyan, fontWeight: 700 }}>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", flexWrap: "wrap", gap: spaceTokens[3] }}>
              <Link
                href="/explorar"
                style={{
                  ...buttonStyle,
                  alignItems: "center",
                  background: colors.surface,
                  color: colors.primary,
                  display: "inline-flex",
                  textDecoration: "none",
                }}
              >
                Comprar ahora →
              </Link>
              <Link
                href="/carrito"
                style={{
                  ...secondaryButtonStyle,
                  alignItems: "center",
                  background: "transparent",
                  borderColor: "rgba(255,255,255,0.45)",
                  color: colors.primaryOn,
                  display: "inline-flex",
                  textDecoration: "none",
                }}
              >
                Ir al carrito
              </Link>
            </div>
          </div>
          <div className="cve-hero-art cve-hero-art-motion" aria-hidden="true" style={{ alignItems: "center", display: "flex", justifyContent: "center" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.22)",
                borderRadius: 24,
                display: "grid",
                gap: spaceTokens[3],
                minHeight: 180,
                padding: spaceTokens[6],
                placeItems: "center",
                width: "100%",
              }}
            >
              <IconBox />
              <p style={{ fontSize: 13, margin: 0, textAlign: "center" }}>USA → almacén → Venezuela</p>
            </div>
          </div>
        </div>
      </section>

      <ProductList query="" />

      <ReferenceStoreCards />

      <section aria-label="Categorías populares" id="categorias" style={{ marginTop: spaceTokens[6] }}>
        <h2 style={headingStyle}>Categorías populares</h2>
        <p style={mutedStyle}>Guía visual del diseño. El catálogo demo no publica existencias por categoría.</p>
        <ul className="cve-category-row">
          {popularCategoryLabels.map((name) => (
            <li key={name}>
              <Link
                href={`/explorar?text=${encodeURIComponent(name)}`}
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
                  {name.slice(0, 1)}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center" }}>{name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="como-funciona" aria-label="Cómo funciona" style={{ marginTop: spaceTokens[8] }}>
        <h2 style={headingStyle}>Cómo funciona</h2>
        <ol className="cve-steps-grid" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {[
            "Busca en el catálogo demo o pega el enlace de un producto de USA.",
            "Pedimos una cotización: el importe lo escribe el equipo, no un robot.",
            "Pagas en USD con los métodos disponibles y hacemos el seguimiento del envío a Venezuela.",
          ].map((step, index) => (
            <li
              key={step}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                display: "grid",
                gap: 8,
                gridTemplateColumns: "32px 1fr",
                height: "100%",
                padding: spaceTokens[4],
              }}
            >
              <span
                style={{
                  alignItems: "center",
                  background: colors.primary,
                  borderRadius: "50%",
                  color: colors.primaryOn,
                  display: "flex",
                  fontSize: 14,
                  fontWeight: 700,
                  height: 32,
                  justifyContent: "center",
                  width: 32,
                }}
              >
                {index + 1}
              </span>
              <p style={{ ...bodyStyle, margin: 0 }}>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <p style={{ ...bodyStyle, marginTop: spaceTokens[6] }}>
        <Link href="/pedidos" style={linkStyle}>
          Ver pedidos activos
        </Link>
      </p>
    </PageFrame>
  );
}

function useGreeting(): string {
  const [greeting, setGreeting] = useState("Hola");

  useEffect(() => {
    const session = readSession();
    if (!session) {
      return;
    }
    let cancelled = false;
    getAccountProfile(apiBase, session.accessToken)
      .then((profile) => {
        const name = profile.givenName?.trim();
        if (!cancelled && name) {
          setGreeting(`Hola, ${name}`);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return greeting;
}
