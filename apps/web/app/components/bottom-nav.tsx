"use client";

import { fontTokens, spaceTokens } from "@comprausa/design-tokens";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors } from "./styles";

const items = [
  { href: "/", label: "Inicio" },
  { href: "/explorar", label: "Explorar" },
  { href: "/carrito", label: "Carrito" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/perfil", label: "Perfil" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      style={{
        background: colors.surface,
        borderTop: `1px solid ${colors.background}`,
        bottom: 0,
        boxShadow: "0 -1px 2px rgba(20, 36, 59, 0.08)",
        display: "flex",
        left: 0,
        position: "fixed",
        right: 0,
        zIndex: 2,
      }}
    >
      {items.map((item) => {
        const current = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            style={{
              alignItems: "center",
              color: current ? colors.primary : colors.text,
              display: "flex",
              flex: 1,
              fontSize: fontTokens.sizes.caption,
              justifyContent: "center",
              lineHeight: `${fontTokens.lineHeight.caption}px`,
              minHeight: 44,
              padding: `${spaceTokens[2]}px ${spaceTokens[1]}px`,
              textDecoration: "none",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
