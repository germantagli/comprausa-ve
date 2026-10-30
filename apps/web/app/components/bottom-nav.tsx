"use client";

import { fontTokens, spaceTokens } from "@comprausa/design-tokens";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCart, IconHome, IconOrders, IconProfile, IconStores } from "./icons";
import { colors } from "./styles";

const items = [
  { href: "/", label: "Inicio", Icon: IconHome },
  { href: "/explorar", label: "Explorar", Icon: IconStores },
  { href: "/carrito", label: "Carrito", Icon: IconCart },
  { href: "/pedidos", label: "Pedidos", Icon: IconOrders },
  { href: "/perfil", label: "Perfil", Icon: IconProfile },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="cve-bottom-nav"
      style={{
        background: colors.surface,
        borderTop: `1px solid ${colors.border}`,
        bottom: 0,
        boxShadow: "0 -1px 2px rgba(20, 36, 59, 0.08)",
        left: 0,
        position: "fixed",
        right: 0,
        /* display lo controla .cve-bottom-nav en globals.css (oculto desde 768px) */
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
              color: current ? colors.primary : colors.muted,
              display: "flex",
              flex: 1,
              flexDirection: "column",
              fontSize: fontTokens.sizes.caption,
              fontWeight: current ? 700 : 500,
              gap: 2,
              justifyContent: "center",
              lineHeight: `${fontTokens.lineHeight.caption}px`,
              minHeight: 56,
              padding: `${spaceTokens[2]}px ${spaceTokens[1]}px`,
              textDecoration: "none",
            }}
          >
            <item.Icon active={current} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
