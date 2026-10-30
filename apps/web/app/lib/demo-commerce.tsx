"use client";

/**
 * DEMO commerce state — mock cart + favorites shared across Home, Explorar, Detalle, Carrito.
 * Persisted in localStorage. Never sent to the backend.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultDemoFilters,
  getDemoProduct,
  type DemoFilterState,
  type DemoProduct,
} from "./products.mock";

const CART_KEY = "traelo.demo.cart.v1";
const FAV_KEY = "traelo.demo.favorites.v1";
const FILTERS_KEY = "traelo.demo.exploreFilters.v1";

export type DemoCartItem = {
  /** Stable line id: productId + variant key. */
  itemId: string;
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  variant?: string;
};

type DemoCommerceValue = {
  ready: boolean;
  cart: DemoCartItem[];
  favorites: Set<string>;
  exploreFilters: DemoFilterState;
  toast: string | null;
  addToCart: (product: DemoProduct, variant?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartCount: () => number;
  getCartSubtotal: () => number;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  setExploreFilters: (next: DemoFilterState) => void;
  resetExploreFilters: () => void;
  clearToast: () => void;
};

const DemoCommerceContext = createContext<DemoCommerceValue | null>(null);

function cartLineId(productId: string, variant?: string): string {
  return variant ? `${productId}::${variant}` : productId;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export function DemoCommerceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<DemoCartItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [exploreFilters, setExploreFiltersState] = useState<DemoFilterState>(defaultDemoFilters);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCart(readJson<DemoCartItem[]>(CART_KEY, []));
    setFavoriteIds(readJson<string[]>(FAV_KEY, []));
    setExploreFiltersState(readJson<DemoFilterState>(FILTERS_KEY, defaultDemoFilters));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    writeJson(CART_KEY, cart);
  }, [cart, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    writeJson(FAV_KEY, favoriteIds);
  }, [favoriteIds, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    writeJson(FILTERS_KEY, exploreFilters);
  }, [exploreFilters, ready]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const addToCart = useCallback((product: DemoProduct, variant?: string) => {
    const itemId = cartLineId(product.id, variant);
    setCart((current) => {
      const existing = current.find((item) => item.itemId === itemId);
      if (existing) {
        return current.map((item) =>
          item.itemId === itemId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...current,
        {
          itemId,
          productId: product.id,
          name: product.name,
          image: product.image,
          unitPrice: product.price,
          quantity: 1,
          ...(variant ? { variant } : {}),
        },
      ];
    });
    setToast("Producto agregado al carrito");
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((current) => current.filter((item) => item.itemId !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.itemId !== itemId));
      return;
    }
    setCart((current) =>
      current.map((item) => (item.itemId === itemId ? { ...item, quantity } : item)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getCartCount = useCallback(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const getCartSubtotal = useCallback(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart],
  );

  const toggleFavorite = useCallback((productId: string) => {
    if (!getDemoProduct(productId)) {
      return;
    }
    setFavoriteIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
    );
  }, []);

  const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback((productId: string) => favorites.has(productId), [favorites]);

  const setExploreFilters = useCallback((next: DemoFilterState) => {
    setExploreFiltersState(next);
  }, []);

  const resetExploreFilters = useCallback(() => {
    setExploreFiltersState(defaultDemoFilters);
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const value = useMemo<DemoCommerceValue>(
    () => ({
      ready,
      cart,
      favorites,
      exploreFilters,
      toast,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartCount,
      getCartSubtotal,
      toggleFavorite,
      isFavorite,
      setExploreFilters,
      resetExploreFilters,
      clearToast,
    }),
    [
      ready,
      cart,
      favorites,
      exploreFilters,
      toast,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartCount,
      getCartSubtotal,
      toggleFavorite,
      isFavorite,
      setExploreFilters,
      resetExploreFilters,
      clearToast,
    ],
  );

  return <DemoCommerceContext.Provider value={value}>{children}</DemoCommerceContext.Provider>;
}

export function useDemoCommerce(): DemoCommerceValue {
  const ctx = useContext(DemoCommerceContext);
  if (!ctx) {
    throw new Error("useDemoCommerce must be used within DemoCommerceProvider");
  }
  return ctx;
}
