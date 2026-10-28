import type { ReactNode } from "react";
import { colorTokens, fontTokens } from "@comprausa/design-tokens";
import "./globals.css";

const colors = colorTokens.light;

export const metadata = {
  title: "TraeLo",
  description: "Compra en tiendas de USA y recíbelo en Venezuela. Catálogo de demostración sin checkout indexable.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          background: colors.background,
          color: colors.text,
          fontFamily: fontTokens.family,
          margin: 0,
        }}
      >
        <style>{`a:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid ${colors.primary}; outline-offset: 2px; }`}</style>
        {children}
      </body>
    </html>
  );
}
