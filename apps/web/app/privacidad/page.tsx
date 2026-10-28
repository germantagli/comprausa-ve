import Link from "next/link";

export const metadata = {
  title: "Política de Privacidad · TraeLo",
  robots: { index: false, follow: false },
};

export default function PrivacidadPage() {
  return (
    <main style={{ margin: "0 auto", maxWidth: 640, padding: 24 }}>
      <h1>Política de Privacidad</h1>
      <p>Documento en preparación. TraeLo trata datos de cuenta y envío solo para operar el servicio.</p>
      <p>
        <Link href="/entrar">Volver</Link>
      </p>
    </main>
  );
}
