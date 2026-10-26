import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "CompraUSA — administración",
  description: "Panel interno separado del sitio público.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
