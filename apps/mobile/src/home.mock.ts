/**
 * DEMO visual data for TraeLo Home presentation.
 * Temporary mock — not live catalog, not backend pricing.
 */
import type { ImageSourcePropType } from "react-native";

export const HOME_DEMO = true as const;

export type HomeDemoProduct = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
  rating: number;
  reviewCount: number;
  image: ImageSourcePropType;
};

export type HomeDemoCategory = {
  id: string;
  name: string;
  image: ImageSourcePropType;
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
  art: ImageSourcePropType;
};

export const homeDemoCategories: readonly HomeDemoCategory[] = [
  { id: "electronica", name: "Tecnología", image: require("../assets/images/home/cat-electronica.png") },
  { id: "ropa", name: "Moda", image: require("../assets/images/home/cat-ropa.png") },
  { id: "calzado", name: "Calzado", image: require("../assets/images/home/cat-calzado.png") },
  { id: "hogar", name: "Hogar", image: require("../assets/images/home/cat-hogar.png") },
  { id: "belleza", name: "Belleza", image: require("../assets/images/home/cat-belleza.png") },
  { id: "deportes", name: "Deportes", image: require("../assets/images/home/cat-deportes.png") },
];

export const homeDemoFeaturedProducts: readonly HomeDemoProduct[] = [
  {
    id: "demo-audifonos",
    name: "Audífonos inalámbricos",
    price: 39.99,
    compareAtPrice: 49.99,
    discountPercent: 20,
    rating: 5,
    reviewCount: 128,
    image: require("../assets/images/home/demo/product-earbuds.png"),
  },
  {
    id: "demo-zapatos",
    name: "Zapatos deportivos",
    price: 59.99,
    rating: 5,
    reviewCount: 86,
    image: require("../assets/images/home/demo/product-sneakers.png"),
  },
  {
    id: "demo-smartwatch",
    name: "Smartwatch",
    price: 89.99,
    rating: 5,
    reviewCount: 64,
    image: require("../assets/images/home/demo/product-watch.png"),
  },
];

export const homeDemoOffers: readonly HomeDemoOffer[] = [
  {
    id: "electronics",
    title: "Electrónica con descuentos",
    exploreQuery: "Tecnología",
    titleColor: "#0D3A7A",
    buttonBackground: "#1B5FC7",
    buttonColor: "#FFFFFF",
    background: "#F5EFE6",
    art: require("../assets/images/home/demo/offer-electronics-art.png"),
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
    art: require("../assets/images/home/demo/offer-fashion-art.png"),
  },
];

export const homeDemoHero = {
  titleBefore: "Tus compras de USA, directo a ",
  titleAccent: "Venezuela",
  subtitle: "Miles de productos seleccionados para ti, con envío seguro.",
  cta: "Comprar ahora",
  /** Full illustration — left open sky for live text/CTA overlay. */
  backgroundArt: require("../assets/images/home/demo/hero-banner.png"),
  art: require("../assets/images/home/demo/hero-art.png"),
} as const;

export const homeDemoRequest = {
  title: "¿No encuentras un producto?",
  subtitle: "Envíanos el enlace y te preparamos una cotización.",
  cta: "Solicitar producto",
  /** Full banner — left open for live title/CTA. */
  backgroundArt: require("../assets/images/home/demo/request-banner.png"),
  art: require("../assets/images/home/demo/request-art.png"),
} as const;

export const homeDemoBadges = {
  notifications: 1,
  /** @deprecated Prefer useDemoCommerce().getCartCount() */
  cart: 0,
} as const;

export function formatDemoPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}
