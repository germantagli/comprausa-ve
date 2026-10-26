"use client";

import { getAccountProfile } from "@comprausa/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { readSession } from "../lib/session";
import { CategoryList, ProductList, SearchForm, StoreList } from "./catalog-views";
import { bannerStyle, bodyStyle, colors, headingStyle, linkStyle, pageStyle, titleStyle, wordmarkStyle } from "./styles";

export function HomeScreen() {
  const greeting = useGreeting();
  const router = useRouter();
  const [draft, setDraft] = useState("");

  return (
    <main style={pageStyle}>
      <Link href="/" style={wordmarkStyle}>
        CompraUSA VE
      </Link>
      <h1 style={titleStyle}>{greeting}</h1>
      <p style={bodyStyle}>
        <Link href="/carrito" style={linkStyle}>
          Carrito
        </Link>
      </p>
      <SearchForm
        value={draft}
        onChange={setDraft}
        onSubmit={() => {
          const text = draft.trim();
          router.push(text.length > 0 ? `/explorar?text=${encodeURIComponent(text)}` : "/explorar");
        }}
      />
      <CategoryList />
      <StoreList title="Tiendas destacadas" label="Tiendas destacadas" />
      <ProductList query="" />
      <section aria-label="De Estados Unidos a Venezuela" style={bannerStyle}>
        <h2 style={{ ...headingStyle, color: colors.primaryOn }}>De Estados Unidos a Venezuela</h2>
        <p style={{ margin: 0 }}>
          El catálogo de demostración no publica precios, existencia ni fechas de envío. La compra y el envío a Venezuela todavía no están en esta pantalla.
        </p>
      </section>
      <p style={bodyStyle}>
        <Link href="/pedidos" style={{ ...linkStyle, color: colors.primary }}>
          Ver pedidos activos
        </Link>
      </p>
    </main>
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
