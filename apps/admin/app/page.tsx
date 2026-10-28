const nav = ["Resumen", "Cotizaciones", "Pagos", "Pedidos", "Seguimiento", "Catálogo demo"] as const;

const queues = [
  {
    title: "Cotizaciones pendientes",
    body: "El operador escribe el importe en centavos. El cliente no inventa precios.",
  },
  {
    title: "Comprobantes en revisión",
    body: "Pago Móvil o Zelle quedan en revisión hasta verificación manual.",
  },
  {
    title: "Logística",
    body: "Compra en USA, almacén, tránsito y entrega en Venezuela son actos separados del pago.",
  },
] as const;

export default function AdminHomePage() {
  return (
    <div className="adm-shell">
      <aside className="adm-side" aria-label="Navegación interna">
        <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>TraeLo</p>
        <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, margin: "0 0 24px" }}>Panel de administración</p>
        <nav style={{ display: "grid", gap: 8 }}>
          {nav.map((item, index) => (
            <span
              key={item}
              style={{
                background: index === 0 ? "rgba(255,255,255,0.14)" : "transparent",
                borderRadius: 10,
                fontWeight: index === 0 ? 700 : 500,
                padding: "10px 12px",
              }}
            >
              {item}
            </span>
          ))}
        </nav>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 32 }}>
          App aparte del sitio público. Sin cobros ni conectores de tienda en este corte.
        </p>
      </aside>

      <main className="adm-main">
        <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Operaciones</h1>
        <p style={{ color: "var(--adm-muted)", margin: "0 0 24px" }}>
          Vista de panel para cotizaciones, pagos y seguimiento. Los datos reales llegan cuando el operador actúa; no hay precios inventados.
        </p>

        <div className="adm-grid">
          {queues.map((item) => (
            <section key={item.title} className="adm-card">
              <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>{item.title}</h2>
              <p style={{ color: "var(--adm-muted)", margin: 0 }}>{item.body}</p>
              <p style={{ fontWeight: 700, margin: "16px 0 0" }}>0 en cola</p>
            </section>
          ))}
        </div>

        <section className="adm-card" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Seguimiento de ejemplo</h2>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li>Pago confirmado</li>
            <li>Compra en USA</li>
            <li>Recibido en almacén USA</li>
            <li>En tránsito internacional</li>
            <li>En Venezuela</li>
            <li>Entregado</li>
          </ol>
          <p style={{ color: "var(--adm-muted)", marginTop: 12 }}>
            Esta pantalla no mueve estados todavía. El sitio público de cliente vive en otra app.
          </p>
        </section>
      </main>
    </div>
  );
}
