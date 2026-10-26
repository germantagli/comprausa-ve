import { bodyStyle, pageStyle, titleStyle } from "./styles";

export function OrdersScreen() {
  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Pedidos</h1>
      <p role="status" style={bodyStyle}>
        No tienes pedidos activos.
      </p>
    </main>
  );
}
