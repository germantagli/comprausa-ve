import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "TraeLo — administración",
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
