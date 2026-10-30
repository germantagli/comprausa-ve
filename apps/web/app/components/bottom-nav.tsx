"use client";

import { getCart } from "@comprausa/api-client";
import { fontTokens, spaceTokens } from "@comprausa/design-tokens";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBase } from "../lib/api";
import { homeDemoBadges } from "../lib/home.mock";
import { readSession } from "../lib/session";
import { IconCart, IconExplore, IconHome, IconOrders, IconProfile } from "./icons";
import { colors } from "./styles";

const items = [
  { href: "/", label: "Inicio", Icon: IconHome },
  { href: "/explorar", label: "Explorar", Icon: IconExplore },
  { href: "/carrito", label: "Carrito", Icon: IconCart },
  { href: "/pedidos", label: "Pedidos", Icon: IconOrders },
  { href: "/perfil", label: "Perfil", Icon: IconProfile },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState<number>(homeDemoBadges.cart);

  useEffect(() => {
    let cancelled = false;
    const session = readSession();
    if (!session?.accessToken) {
      setCartCount(homeDemoBadges.cart);
      return;
    }
    getCart(apiBase, session.accessToken)
      .then((cart) => {
        if (!cancelled) {
          const real = cart.groups.reduce((sum, group) => sum + group.items.reduce((inner, item) => inner + item.quantity, 0), 0);
          setCartCount(real > 0 ? real : homeDemoBadges.cart);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCartCount(homeDemoBadges.cart);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

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
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
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
            <span style={{ display: "inline-flex", position: "relative" }}>
              <item.Icon active={current} />
              {item.href === "/carrito" && cartCount > 0 ? (
                <span
                  aria-label={`${cartCount} en el carrito`}
                  style={{
                    alignItems: "center",
                    background: "#E11D48",
                    borderRadius: 999,
                    color: "#fff",
                    display: "inline-flex",
                    fontSize: 10,
                    fontWeight: 700,
                    height: 15,
                    justifyContent: "center",
                    minWidth: 15,
                    padding: "0 3px",
                    position: "absolute",
                    right: -8,
                    top: -4,
                  }}
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
