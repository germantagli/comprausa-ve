import type { ReactNode } from "react";

export const metadata = {
  title: "CompraUSA VE — administración",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
