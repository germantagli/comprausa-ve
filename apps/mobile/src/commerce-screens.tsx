import {
  ApiClientError,
  getCatalogAvailability,
  getCatalogPricing,
  getCatalogProduct,
  getQuote,
  type AuthenticatedSession,
  type CatalogAvailability,
  type CatalogDetail,
  type CatalogPricing,
  type QuoteView,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { catalogPriceLabel, formatUsdFromMinor, subtotalLabel } from "@comprausa/utils";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiBase } from "./api";
import { useDemoCommerce } from "./demo-commerce";
import { MobilePaymentPanel } from "./payment-screens";
import { formatDemoPrice, getDemoProduct } from "./products.mock";

const colors = colorTokens.light;

const DEMO_VARIANTS: Record<string, string[]> = {
  "demo-zapatos": ["36", "37", "38", "39", "40", "41", "42"],
  "demo-camiseta": ["S", "M", "L", "XL"],
};

export function MobileProductScreen({
  productId,
  session,
  onBack,
  onOpenCart,
}: {
  productId: string;
  session: AuthenticatedSession | null;
  onBack: () => void;
  onOpenCart: () => void;
}) {
  const demo = getDemoProduct(productId);
  if (demo) {
    return <DemoMobileProductScreen productId={productId} onBack={onBack} onOpenCart={onOpenCart} />;
  }
  return (
    <LegacyMobileProductScreen productId={productId} session={session} onBack={onBack} onOpenCart={onOpenCart} />
  );
}

function DemoMobileProductScreen({
  productId,
  onBack,
  onOpenCart,
}: {
  productId: string;
  onBack: () => void;
  onOpenCart: () => void;
}) {
  const product = getDemoProduct(productId)!;
  const { addToCart, toast, clearToast } = useDemoCommerce();
  const variants = DEMO_VARIANTS[product.id] ?? [];
  const [selected, setSelected] = useState<string | null>(variants[0] ?? null);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>Volver</Text>
      </Pressable>
      <View style={styles.demoPhoto}>
        <Image source={product.image} style={styles.demoImage} resizeMode="contain" />
      </View>
      <Text style={styles.badge}>DEMO</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {product.name}
      </Text>
      <Text style={styles.caption}>{product.category}</Text>
      <Text style={styles.price}>{formatDemoPrice(product.price)}</Text>
      <Text style={styles.caption}>
        ★ {product.rating.toFixed(1)} · {product.reviewCount} reseñas (mock)
      </Text>
      {variants.length > 0 ? (
        <View style={styles.variantRow}>
          {variants.map((variant) => {
            const on = selected === variant;
            return (
              <Pressable
                key={variant}
                onPress={() => setSelected(variant)}
                style={[styles.variantChip, on ? styles.variantOn : null]}
              >
                <Text style={[styles.variantText, on ? styles.variantTextOn : null]}>{variant}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Text style={styles.caption}>Ficha de demostración. Precios ficticios. Checkout próximamente.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => addToCart(product, selected ?? undefined)}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>Agregar al carrito</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onOpenCart} style={styles.secondary}>
        <Text style={styles.body}>Ver carrito</Text>
      </Pressable>
      {toast ? (
        <Pressable onPress={clearToast}>
          <Text style={styles.success}>{toast}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function LegacyMobileProductScreen({
  productId,
  session: _session,
  onBack,
  onOpenCart,
}: {
  productId: string;
  session: AuthenticatedSession | null;
  onBack: () => void;
  onOpenCart: () => void;
}) {
  const [phase, setPhase] = useState<"loading" | "error" | "missing" | "ready">("loading");
  const [detail, setDetail] = useState<{ product: CatalogDetail; pricing: CatalogPricing; availability: CatalogAvailability } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    Promise.all([
      getCatalogProduct(apiBase, productId),
      getCatalogPricing(apiBase, productId),
      getCatalogAvailability(apiBase, productId),
    ])
      .then(([product, pricing, availability]) => {
        if (!cancelled) {
          setDetail({ product, pricing, availability });
          setPhase("ready");
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setPhase(caught instanceof ApiClientError && caught.status === 404 ? "missing" : "error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productId, attempt]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>Volver</Text>
      </Pressable>
      {phase === "loading" ? <Text style={styles.body}>Cargando…</Text> : null}
      {phase === "missing" ? <Text style={styles.body}>No encontramos ese artículo.</Text> : null}
      {phase === "error" ? (
        <View>
          <Text style={styles.error}>No pudimos cargar la ficha.</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((current) => current + 1)} style={styles.primary}>
            <Text style={styles.primaryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {phase === "ready" && detail ? (
        <View>
          <View style={styles.photoSlot}>
            <Text style={styles.caption}>
              {detail.product.photos.length === 0 ? "No hay fotos." : detail.product.photos.join(", ")}
            </Text>
          </View>
          <Text style={styles.badge}>Ficticio</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {detail.product.name}
          </Text>
          <Text style={styles.caption}>Marca: {detail.product.brand ?? "Sin marca en esta ficha."}</Text>
          <Text style={styles.caption}>Tienda: {detail.product.store?.name ?? "Sin tienda."}</Text>
          <Text style={styles.heading}>{catalogPriceLabel(detail.pricing)}</Text>
          <Text style={styles.body}>
            {detail.product.variants.length === 0 ? "No hay variantes." : detail.product.variants.map((item) => item.name).join(", ")}
          </Text>
          <Text style={styles.body}>
            {detail.availability.status === "UNKNOWN" || detail.availability.quantity === null
              ? `Disponibilidad desconocida. ${detail.availability.note}`
              : `Disponibilidad: ${detail.availability.quantity}. ${detail.availability.note}`}
          </Text>
          <Text style={styles.body}>{detail.product.description}</Text>
          <Text style={styles.caption}>{detail.product.disclaimer}</Text>
          <Text style={styles.caption}>Usa Explorar DEMO para el carrito mock compartido.</Text>
          <Pressable accessibilityRole="button" onPress={onOpenCart} style={styles.secondary}>
            <Text style={styles.body}>Ir al carrito</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

/** DEMO cart — shared mock commerce state (no backend / no login required). */
export function MobileCartScreen({
  onOpenProduct,
}: {
  session: AuthenticatedSession | null;
  onOpenProduct: (productId: string) => void;
  onOpenQuote: (quoteId: string) => void;
  onSignIn: () => void;
}) {
  const { cart, ready, updateQuantity, removeFromCart, clearCart, getCartCount, getCartSubtotal } =
    useDemoCommerce();

  if (!ready) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.body}>Cargando…</Text>
      </ScrollView>
    );
  }

  const count = getCartCount();
  const subtotal = getCartSubtotal();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.cartHeader}>
        <Text accessibilityRole="header" style={styles.title}>
          Carrito
        </Text>
        {count > 0 ? (
          <Pressable accessibilityRole="button" onPress={clearCart}>
            <Text style={styles.error}>Vaciar</Text>
          </Pressable>
        ) : null}
      </View>

      {count === 0 ? (
        <View style={styles.emptyCart}>
          <Text style={styles.heading}>Tu carrito está vacío</Text>
          <Text style={styles.caption}>Explora el catálogo de demostración y agrega productos.</Text>
        </View>
      ) : (
        <>
          {cart.map((item) => {
            const product = getDemoProduct(item.productId);
            return (
              <View key={item.itemId} style={styles.cartRow}>
                {product ? (
                  <Image source={product.image} style={styles.cartThumb} resizeMode="contain" />
                ) : (
                  <View style={styles.cartThumb} />
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <Pressable onPress={() => onOpenProduct(item.productId)}>
                    <Text style={styles.body}>{item.name}</Text>
                  </Pressable>
                  {item.variant ? <Text style={styles.caption}>Variante: {item.variant}</Text> : null}
                  <Text style={styles.price}>{formatDemoPrice(item.unitPrice)}</Text>
                  <View style={styles.qtyRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => updateQuantity(item.itemId, item.quantity - 1)}
                      style={styles.qtyBtn}
                    >
                      <Text style={styles.qtyGlyph}>−</Text>
                    </Pressable>
                    <Text style={styles.body}>{item.quantity}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => updateQuantity(item.itemId, item.quantity + 1)}
                      style={styles.qtyBtn}
                    >
                      <Text style={styles.qtyGlyph}>+</Text>
                    </Pressable>
                    <Pressable onPress={() => removeFromCart(item.itemId)}>
                      <Text style={styles.caption}>Quitar</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={styles.summary}>
            <Text style={styles.heading}>Subtotal DEMO</Text>
            <Text style={styles.price}>{formatDemoPrice(subtotal)}</Text>
            <Text style={styles.caption}>
              Precios ficticios para demostración. El checkout real llega en una próxima pantalla.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

export function MobileQuoteScreen({
  quoteId,
  session,
  onBack,
}: {
  quoteId: string;
  session: AuthenticatedSession | null;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!session) {
      setPhase("error");
      return;
    }
    let cancelled = false;
    setPhase("loading");
    getQuote(apiBase, session.accessToken, quoteId)
      .then((next) => {
        if (!cancelled) {
          setQuote(next);
          setPhase("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [quoteId, session, attempt]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>Volver</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Cotización
      </Text>
      {phase === "loading" ? <Text style={styles.body}>Cargando…</Text> : null}
      {phase === "error" ? (
        <View>
          <Text style={styles.error}>No pudimos cargar la cotización.</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((current) => current + 1)} style={styles.primary}>
            <Text style={styles.primaryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {phase === "ready" && quote ? (
        <View>
          <Text style={styles.heading}>
            {quote.status === "PENDING_VALIDATION" ? "Pendiente de validación" : quote.status === "FINAL" ? "Importe publicado" : "Aceptada"}
          </Text>
          <Text style={styles.body}>Identificador: {quote.id}</Text>
          <Text style={styles.body}>Esta cotización no se puede marcar como pagada ni como final desde aquí.</Text>
          <Text style={styles.body}>
            {quote.address.state}, {quote.address.city}, {quote.address.municipality}. {quote.address.reference}
          </Text>
          {quote.lines.map((line, index) => (
            <View key={`${line.description}-${index}`} style={styles.card}>
              <Text style={styles.heading}>{line.description}</Text>
              {line.sourceUrl ? <Text style={styles.body}>{line.sourceUrl}</Text> : null}
              <Text style={styles.body}>Cantidad: {line.quantity}</Text>
              <Text style={styles.body}>{line.unitAmountMinor === null ? "Precio por cotización" : formatUsdFromMinor(line.unitAmountMinor)}</Text>
            </View>
          ))}
          <Text style={styles.heading}>{subtotalLabel(quote.subtotal)}</Text>
          {session ? <MobilePaymentPanel quote={quote} session={session} onChanged={() => setAttempt((current) => current + 1)} /> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, padding: spaceTokens[4], paddingBottom: spaceTokens[8] },
  title: {
    color: colors.text,
    fontSize: fontTokens.sizes.title,
    fontWeight: "700",
    lineHeight: fontTokens.lineHeight.title,
    marginBottom: spaceTokens[3],
  },
  heading: {
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[2],
  },
  body: { color: colors.text, fontSize: fontTokens.sizes.body, lineHeight: fontTokens.lineHeight.body, marginBottom: spaceTokens[3] },
  caption: { color: colors.muted, fontSize: fontTokens.sizes.caption, lineHeight: fontTokens.lineHeight.caption, marginBottom: spaceTokens[3] },
  link: { color: colors.primary, fontSize: fontTokens.sizes.body },
  linkHit: { justifyContent: "center", minHeight: 44 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    color: colors.text,
    marginBottom: spaceTokens[3],
    minHeight: 44,
    paddingHorizontal: spaceTokens[3],
  },
  primary: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    marginBottom: spaceTokens[3],
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  primaryText: { color: colors.primaryOn, fontSize: fontTokens.sizes.body, fontWeight: "600" },
  secondary: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: spaceTokens[2],
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    marginBottom: spaceTokens[3],
    padding: spaceTokens[4],
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.lg,
    borderWidth: 1,
    marginBottom: spaceTokens[4],
    marginTop: spaceTokens[2],
    padding: spaceTokens[4],
  },
  photoSlot: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    marginBottom: spaceTokens[3],
    minHeight: 180,
  },
  qtyRow: { alignItems: "center", flexDirection: "row", gap: spaceTokens[2], marginBottom: spaceTokens[3] },
  qtyButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  qtyInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    color: colors.text,
    minHeight: 44,
    paddingHorizontal: spaceTokens[3],
    textAlign: "center",
    width: 72,
  },
  badge: {
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    color: colors.deep,
    fontSize: fontTokens.sizes.caption,
    fontWeight: "600",
    marginBottom: spaceTokens[2],
    paddingHorizontal: spaceTokens[2],
  },
  error: { color: colors.error, fontSize: fontTokens.sizes.body, marginBottom: spaceTokens[3] },
  success: { color: colors.success, fontSize: fontTokens.sizes.body, marginBottom: spaceTokens[3] },
  price: { color: colors.primary, fontSize: 18, fontWeight: "800", marginBottom: spaceTokens[2] },
  demoPhoto: {
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderColor: "#E8EEF5",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spaceTokens[3],
    overflow: "hidden",
    width: "100%",
  },
  demoImage: { height: "100%", width: "100%" },
  variantRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spaceTokens[3] },
  variantChip: {
    borderColor: "#D7E0EC",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    minWidth: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  variantOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  variantText: { color: colors.deep, fontWeight: "700", textAlign: "center" },
  variantTextOn: { color: "#FFFFFF" },
  cartHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  emptyCart: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8EEF5",
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
  },
  cartRow: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8EEF5",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    padding: 12,
  },
  cartThumb: { backgroundColor: "#F7FAFD", borderRadius: 10, height: 72, width: 72 },
  qtyBtn: {
    alignItems: "center",
    backgroundColor: "#F1F4F8",
    borderColor: "#E4EAF1",
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  qtyGlyph: { color: colors.deep, fontWeight: "700" },
});
