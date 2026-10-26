/**
 * Chrome de maqueta: nombres en texto, sin logos oficiales ni inventario real.
 * El catálogo demo sigue siendo el de la API (artículos ficticios sin precio).
 */
export const partnerStoreNames = [
  "Amazon",
  "Walmart",
  "eBay",
  "SHEIN",
  "Temu",
  "Nike",
  "Best Buy",
  "Target",
] as const;

export const popularCategoryLabels = [
  "Electrónica",
  "Ropa y moda",
  "Calzado",
  "Hogar",
  "Belleza",
  "Deportes",
  "Juguetes",
  "Más",
] as const;

export const checkoutSteps = ["Dirección", "Envío", "Pago", "Resumen"] as const;

export const paymentMethodLabels = [
  { id: "card", label: "Tarjeta de crédito o débito", note: "Solo cuando el entorno lo permita." },
  { id: "paypal", label: "PayPal", note: "Puerto preparado; sin captura en este corte." },
  { id: "zelle", label: "Zelle", note: "Instrucciones manuales si el entorno las trae." },
  { id: "pago-movil", label: "Pago Móvil (Venezuela)", note: "Comprobante en revisión; no se verifica solo." },
] as const;
