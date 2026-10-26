"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { IconSearch } from "./icons";
import { colors, fontTokens, inputStyle, spaceTokens } from "./styles";

const desktopLinks = [
  { href: "/", label: "Inicio" },
  { href: "/explorar", label: "Tiendas" },
  { href: "/explorar#categorias", label: "Categorías" },
  { href: "/#ofertas", label: "Ofertas" },
  { href: "/#como-funciona", label: "Cómo funciona" },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [draft, setDraft] = useState("");

  function onSearch(event: FormEvent): void {
    event.preventDefault();
    const text = draft.trim();
    router.push(text.length > 0 ? `/explorar?text=${encodeURIComponent(text)}` : "/explorar");
  }

  return (
    <header className="cve-site-header" aria-label="Cabecera del sitio">
      <div className="cve-site-header-inner">
        <Link
          href="/"
          style={{
            color: colors.primaryOn,
            fontSize: fontTokens.sizes.title,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: `${fontTokens.lineHeight.title}px`,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          CompraUSA
        </Link>

        <nav className="cve-site-header-nav" aria-label="Secciones">
          {desktopLinks.map((item) => {
            const current =
              item.label === "Inicio"
                ? pathname === "/"
                : item.label === "Tiendas" || item.label === "Categorías"
                  ? pathname.startsWith("/explorar")
                  : false;
            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  color: current ? "#fff" : "rgba(255,255,255,0.88)",
                  display: "inline-flex",
                  fontWeight: current ? 700 : 500,
                  minHeight: 40,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form role="search" className="cve-site-header-search" onSubmit={onSearch}>
          <label style={{ display: "grid", minWidth: 0, position: "relative" }}>
            <span style={{ height: 1, overflow: "hidden", position: "absolute", width: 1 }}>Buscar</span>
            <span
              aria-hidden="true"
              style={{
                alignItems: "center",
                bottom: 0,
                display: "flex",
                left: spaceTokens[3],
                position: "absolute",
                top: 0,
              }}
            >
              <IconSearch />
            </span>
            <input
              style={{ ...inputStyle, border: "none", minHeight: 44, paddingLeft: 40 }}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Busca en el catálogo de demostración"
              aria-label="Buscar en el catálogo"
            />
          </label>
          <button
            type="submit"
            style={{
              background: colors.deep,
              border: "none",
              borderRadius: 12,
              color: colors.primaryOn,
              cursor: "pointer",
              font: "inherit",
              fontWeight: 700,
              minHeight: 44,
              minWidth: 96,
              padding: `0 ${spaceTokens[4]}px`,
            }}
          >
            Buscar
          </button>
        </form>

        <div style={{ alignItems: "center", display: "flex", gap: spaceTokens[3] }}>
          <Link href="/carrito" style={headerLinkStyle}>
            Carrito
          </Link>
          <Link
            href="/perfil"
            style={{
              ...headerLinkStyle,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 999,
              padding: `0 ${spaceTokens[3]}px`,
            }}
          >
            Mi cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}

const headerLinkStyle = {
  alignItems: "center",
  color: colors.primaryOn,
  display: "inline-flex",
  fontWeight: 600,
  minHeight: 40,
  textDecoration: "none",
  whiteSpace: "nowrap",
} as const;
