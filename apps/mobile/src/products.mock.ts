/**
 * DEMO product catalog for TraeLo Explorar / Home / Carrito (mobile).
 * Temporary mock — not live inventory, not real offers, not backend pricing.
 */
import type { ImageSourcePropType } from "react-native";

export const PRODUCTS_DEMO = true as const;

export type DemoProductCategory =
  | "Tecnología"
  | "Moda"
  | "Calzado"
  | "Hogar"
  | "Belleza"
  | "Deportes";

export type DemoProduct = {
  id: string;
  name: string;
  category: DemoProductCategory;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
  rating: number;
  reviewCount: number;
  image: ImageSourcePropType;
  requiresVariant?: boolean;
};

export const DEMO_CATEGORIES = [
  "Todos",
  "Tecnología",
  "Moda",
  "Calzado",
  "Hogar",
  "Belleza",
  "Deportes",
] as const;

export type DemoCategoryChip = (typeof DEMO_CATEGORIES)[number];
export type DemoSortOption = "relevancia" | "precio-asc" | "precio-desc" | "rating";

export const demoProducts: readonly DemoProduct[] = [
  {
    id: "demo-audifonos",
    name: "Audífonos inalámbricos",
    category: "Tecnología",
    price: 39.99,
    compareAtPrice: 49.99,
    discountPercent: 20,
    rating: 5.0,
    reviewCount: 128,
    image: require("../assets/images/home/demo/product-earbuds.png"),
  },
  {
    id: "demo-zapatos",
    name: "Zapatos deportivos",
    category: "Calzado",
    price: 59.99,
    rating: 4.8,
    reviewCount: 86,
    image: require("../assets/images/home/demo/product-sneakers.png"),
    requiresVariant: true,
  },
  {
    id: "demo-smartwatch",
    name: "Smartwatch",
    category: "Tecnología",
    price: 89.99,
    rating: 4.7,
    reviewCount: 64,
    image: require("../assets/images/home/demo/product-watch.png"),
  },
  {
    id: "demo-laptop",
    name: "Laptop 14 pulgadas",
    category: "Tecnología",
    price: 499.99,
    rating: 4.6,
    reviewCount: 42,
    // Provisional DEMO silhouette
    image: require("../assets/images/home/demo/product-laptop.png"),
  },
  {
    id: "demo-auriculares",
    name: "Auriculares Bluetooth",
    category: "Tecnología",
    price: 29.99,
    rating: 4.5,
    reviewCount: 97,
    image: require("../assets/images/home/demo/product-headphones.png"),
  },
  {
    id: "demo-mochila",
    name: "Mochila urbana",
    category: "Moda",
    price: 34.99,
    rating: 4.7,
    reviewCount: 55,
    image: require("../assets/images/home/demo/product-backpack.png"),
  },
  {
    id: "demo-camiseta",
    name: "Camiseta casual",
    category: "Moda",
    price: 19.99,
    rating: 4.6,
    reviewCount: 73,
    image: require("../assets/images/home/demo/product-tshirt.png"),
    requiresVariant: true,
  },
  {
    id: "demo-perfume",
    name: "Perfume",
    category: "Belleza",
    price: 44.99,
    rating: 4.8,
    reviewCount: 38,
    image: require("../assets/images/home/demo/product-perfume.png"),
  },
  {
    id: "demo-sillon",
    name: "Sillón moderno",
    category: "Hogar",
    price: 149.99,
    rating: 4.5,
    reviewCount: 21,
    image: require("../assets/images/home/demo/product-chair.png"),
  },
  {
    id: "demo-balon",
    name: "Balón de fútbol",
    category: "Deportes",
    price: 24.99,
    rating: 4.7,
    reviewCount: 49,
    image: require("../assets/images/home/demo/product-ball.png"),
  },
];

export function getDemoProduct(id: string): DemoProduct | undefined {
  return demoProducts.find((product) => product.id === id);
}

export function formatDemoPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

export type DemoFilterState = {
  categories: DemoProductCategory[];
  minPrice: number;
  maxPrice: number;
  sort: DemoSortOption;
};

export const DEMO_PRICE_BOUNDS = { min: 0, max: 600 } as const;

export const defaultDemoFilters: DemoFilterState = {
  categories: [],
  minPrice: DEMO_PRICE_BOUNDS.min,
  maxPrice: DEMO_PRICE_BOUNDS.max,
  sort: "relevancia",
};

export function filterDemoProducts(
  products: readonly DemoProduct[],
  opts: {
    query: string;
    categoryChip: DemoCategoryChip;
    filters: DemoFilterState;
  },
): DemoProduct[] {
  const q = opts.query.trim().toLowerCase();
  let list = products.filter((product) => {
    if (opts.categoryChip !== "Todos" && product.category !== opts.categoryChip) {
      return false;
    }
    if (opts.filters.categories.length > 0 && !opts.filters.categories.includes(product.category)) {
      return false;
    }
    if (product.price < opts.filters.minPrice || product.price > opts.filters.maxPrice) {
      return false;
    }
    if (q.length === 0) {
      return true;
    }
    return product.name.toLowerCase().includes(q) || product.category.toLowerCase().includes(q);
  });

  switch (opts.filters.sort) {
    case "precio-asc":
      list = [...list].sort((a, b) => a.price - b.price);
      break;
    case "precio-desc":
      list = [...list].sort((a, b) => b.price - a.price);
      break;
    case "rating":
      list = [...list].sort((a, b) => b.rating - a.rating);
      break;
    default:
      break;
  }

  return list;
}
