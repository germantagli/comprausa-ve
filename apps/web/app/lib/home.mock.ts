/**
 * DEMO visual data for TraeLo Home presentation.
 * Temporary mock — not live catalog, not backend pricing.
 * Replace with API adapters when real catalog media/prices ship.
 */

export const HOME_DEMO = true as const;

export type HomeDemoProduct = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
  rating: number;
  reviewCount: number;
  image: string;
};

export type HomeDemoCategory = {
  id: string;
  name: string;
  image: string;
};

export type HomeDemoOffer = {
  id: string;
  title: string;
  subtitle?: string;
  exploreQuery: string;
  titleColor: string;
  buttonBackground: string;
  buttonColor: string;
  /** Solid banner fill (cream / pink). */
  background: string;
  /** Right-side product illustration only. */
  art: string;
};

/** Six Home categories — DEMO labels + local mock art. */
export const homeDemoCategories: readonly HomeDemoCategory[] = [
  { id: "electronica", name: "Tecnología", image: "/brand/home/cat-electronica.webp" },
  { id: "ropa", name: "Moda", image: "/brand/home/cat-ropa.webp" },
  { id: "calzado", name: "Calzado", image: "/brand/home/cat-calzado.webp" },
  { id: "hogar", name: "Hogar", image: "/brand/home/cat-hogar.webp" },
  { id: "belleza", name: "Belleza", image: "/brand/home/cat-belleza.webp" },
  { id: "deportes", name: "Deportes", image: "/brand/home/cat-deportes.webp" },
] as const;

/** Featured products for Home carousel — DEMO commercial presentation. */
export const homeDemoFeaturedProducts: readonly HomeDemoProduct[] = [
  {
    id: "demo-audifonos",
    name: "Audífonos inalámbricos",
    price: 39.99,
    compareAtPrice: 49.99,
    discountPercent: 20,
    rating: 5,
    reviewCount: 128,
    image: "/brand/home/demo/product-earbuds.webp",
  },
  {
    id: "demo-zapatos",
    name: "Zapatos deportivos",
    price: 59.99,
    rating: 5,
    reviewCount: 86,
    image: "/brand/home/demo/product-sneakers.webp",
  },
  {
    id: "demo-smartwatch",
    name: "Smartwatch",
    price: 89.99,
    rating: 5,
    reviewCount: 64,
    image: "/brand/home/demo/product-watch.webp",
  },
] as const;

export const homeDemoOffers: readonly HomeDemoOffer[] = [
  {
    id: "electronics",
    title: "Electrónica con descuentos",
    exploreQuery: "Tecnología",
    titleColor: "#0D3A7A",
    buttonBackground: "#1B5FC7",
    buttonColor: "#FFFFFF",
    background: "#F5EFE6",
    art: "/brand/home/demo/offer-electronics-art.webp",
  },
  {
    id: "fashion",
    title: "Moda y calzado",
    subtitle: "Las mejores marcas a un mejor precio",
    exploreQuery: "Moda",
    titleColor: "#9D174D",
    buttonBackground: "#DB2777",
    buttonColor: "#FFFFFF",
    background: "#FCE7F3",
    art: "/brand/home/demo/offer-fashion-art.webp",
  },
] as const;

export const homeDemoHero = {
  titleBefore: "Tus compras de USA, directo a ",
  titleAccent: "Venezuela",
  subtitle: "Miles de productos seleccionados para ti, con envío seguro.",
  cta: "Comprar ahora",
  /** Full illustration — left open sky for live text/CTA overlay. */
  backgroundArt: "/brand/home/demo/hero-banner.webp",
  art: "/brand/home/demo/hero-art.webp",
} as const;

export const homeDemoRequest = {
  title: "¿No encuentras un producto?",
  subtitle: "Envíanos el enlace y te preparamos una cotización.",
  cta: "Solicitar producto",
  /** Full banner — left open for live title/CTA. */
  backgroundArt: "/brand/home/demo/request-banner.webp",
  art: "/brand/home/demo/request-art.webp",
} as const;

/** Presentation badges — DEMO only. */
export const homeDemoBadges = {
  notifications: 1,
  cart: 3,
} as const;

export function formatDemoPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}
