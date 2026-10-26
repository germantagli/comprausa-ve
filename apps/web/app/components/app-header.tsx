"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors, linkStyle, spaceTokens, wordmarkStyle } from "./styles";

const desktopLinks = [
  { href: "/", label: "Inicio" },
  { href: "/explorar", label: "Tiendas" },
  { href: "/explorar#categorias", label: "Categorías" },
  { href: "/#ofertas", label: "Ofertas" },
  { href: "/#como-funciona", label: "Cómo funciona" },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header
      className="cve-desktop-only"
      style={{
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 3,
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: spaceTokens[6],
          justifyContent: "space-between",
          margin: "0 auto",
          maxWidth: 1120,
          minHeight: 64,
          padding: `0 ${spaceTokens[6]}px`,
        }}
      >
        <Link href="/" style={wordmarkStyle}>
          CompraUSA VE
        </Link>
        <nav aria-label="Secciones" style={{ display: "flex", flexWrap: "wrap", gap: spaceTokens[4] }}>
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
                  ...linkStyle,
                  color: current ? colors.primary : colors.text,
                  fontWeight: current ? 700 : 500,
                  minHeight: 40,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/perfil"
          style={{
            ...linkStyle,
            border: `1px solid ${colors.border}`,
            borderRadius: 999,
            color: colors.text,
            fontWeight: 600,
            gap: spaceTokens[2],
            padding: `0 ${spaceTokens[3]}px`,
          }}
        >
          Mi cuenta
        </Link>
      </div>
    </header>
  );
}
