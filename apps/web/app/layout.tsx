import type { ReactNode } from "react";

export const metadata = {
  title: "CompraUSA VE",
  description: "Esqueleto del sitio público. Todavía no hay catálogo comercial ni páginas para indexar.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
