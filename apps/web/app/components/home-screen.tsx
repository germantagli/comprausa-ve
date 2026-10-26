"use client";

import { getAccountProfile } from "@comprausa/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { readSession } from "../lib/session";
import { CategoryList, ProductList, SearchForm, StoreList } from "./catalog-views";
import { IconBox } from "./icons";
import { PageFrame } from "./page-frame";
import {
  bannerStyle,
  bodyStyle,
  buttonStyle,
  colors,
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
          CompraUSA VE
        </Link>
        <h1 style={{ ...titleStyle, marginTop: spaceTokens[3] }}>{greeting}</h1>
      </div>
      <p className="cve-desktop-only" style={{ ...mutedStyle, marginBottom: spaceTokens[2] }}>
        {greeting}
      </p>

      <SearchForm
        value={draft}
        onChange={setDraft}
        onSubmit={() => {
          const text = draft.trim();
          router.push(text.length > 0 ? `/explorar?text=${encodeURIComponent(text)}` : "/explorar");
        }}
      />

      <section aria-label="Compra en USA, recíbelo en Venezuela" className="cve-fade-up" style={bannerStyle}>
        <div className="cve-hero">
          <div>
            <p style={{ ...mutedStyle, color: "rgba(255,255,255,0.82)", marginBottom: spaceTokens[2] }}>CompraUSA VE</p>
            <h2 className="cve-fade-up-delay" style={{ ...titleStyle, color: colors.primaryOn, fontSize: 28, lineHeight: "34px" }}>
              Compra en tus tiendas favoritas de USA. Recíbelo en Venezuela.
            </h2>
            <p style={{ margin: `0 0 ${spaceTokens[4]}px`, maxWidth: 420 }}>
              Cotizamos el pedido, el envío internacional y la entrega local. El catálogo demo no publica precios ni existencia.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: spaceTokens[3] }}>
              <Link href="/explorar" style={{ ...buttonStyle, alignItems: "center", display: "inline-flex", textDecoration: "none" }}>
                Ver tiendas
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
          <div
            className="cve-hero-art cve-hero-art-motion"
            aria-hidden="true"
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.22)",
                borderRadius: 24,
                display: "grid",
                gap: spaceTokens[3],
                padding: spaceTokens[4],
                placeItems: "center",
                width: "100%",
              }}
            >
              <IconBox />
              <div style={{ display: "flex", gap: 8 }}>
                <span style={heroDot} />
                <span style={{ ...heroDot, background: colors.cyan }} />
                <span style={heroDot} />
              </div>
              <p style={{ fontSize: 12, margin: 0, textAlign: "center" }}>USA → almacén → Venezuela</p>
            </div>
          </div>
        </div>
      </section>

      <StoreList title="Tiendas destacadas" label="Tiendas destacadas" />
      <CategoryList />
      <ProductList query="" />

      <section id="como-funciona" aria-label="Cómo funciona" style={{ marginTop: spaceTokens[8] }}>
        <h2 style={headingStyle}>Cómo funciona</h2>
        <ol style={{ display: "grid", gap: spaceTokens[3], listStyle: "none", margin: 0, padding: 0 }}>
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

const heroDot = {
  background: colors.primaryOn,
  borderRadius: "50%",
  display: "inline-block",
  height: 8,
  width: 8,
} as const;

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
