import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones · TraeLo",
  robots: { index: false, follow: false },
};

export default function TerminosPage() {
  return (
    <main style={{ margin: "0 auto", maxWidth: 640, padding: 24 }}>
      <h1>Términos y Condiciones</h1>
      <p>Documento en preparación. El uso de TraeLo implica aceptación de estos términos cuando se publiquen en versión definitiva.</p>
      <p>
        <Link href="/entrar">Volver</Link>
      </p>
    </main>
  );
}
