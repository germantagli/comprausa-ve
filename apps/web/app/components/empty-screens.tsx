import { bodyStyle, pageStyle, titleStyle } from "./styles";

export function CartScreen() {
  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Carrito</h1>
      <p role="status" style={bodyStyle}>
        Tu carrito está vacío. Todavía no se puede agregar un artículo.
      </p>
    </main>
  );
}

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
