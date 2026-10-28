import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "Entrar · TraeLo",
  description: "Ingreso con un código de un solo uso.",
  robots: { index: false, follow: false },
};

function EntrarFallback() {
  return (
    <main
      style={{
        background: "#FFFFFF",
        minHeight: "100dvh",
        padding: 24,
        textAlign: "center",
      }}
      aria-busy="true"
    >
      <p style={{ color: "#5B6B82", marginTop: 48 }}>Cargando…</p>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<EntrarFallback />}>
      <SignInForm />
    </Suspense>
  );
}
