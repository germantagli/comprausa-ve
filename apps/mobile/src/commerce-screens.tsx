import {
  ApiClientError,
  addCartItem,
  createQuote,
  getCart,
  getCatalogAvailability,
  getCatalogPricing,
  getCatalogProduct,
  getQuote,
  removeCartItem,
  saveCartItem,
  setCartQuantity,
  type AuthenticatedSession,
  type CartView,
  type CatalogAvailability,
  type CatalogDetail,
  type CatalogPricing,
  type QuoteView,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { catalogPriceLabel, formatUsdFromMinor, subtotalLabel } from "@comprausa/utils";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiBase } from "./api";
import { MobilePaymentPanel } from "./payment-screens";

const colors = colorTokens.light;

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
  const [phase, setPhase] = useState<"loading" | "error" | "missing" | "ready">("loading");
  const [detail, setDetail] = useState<{ product: CatalogDetail; pricing: CatalogPricing; availability: CatalogAvailability } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function add(openCart: boolean): Promise<void> {
    if (!session) {
      setError("Entra para usar el carrito.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addCartItem(apiBase, session.accessToken, productId, 1);
      if (openCart) {
        onOpenCart();
        return;
      }
      setMessage("Lo agregamos al carrito.");
    } catch {
      setError("No pudimos agregar el artículo.");
    } finally {
      setBusy(false);
    }
  }

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
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void add(false)} style={styles.primary}>
            <Text style={styles.primaryText}>{busy ? "Espera…" : "Agregar al carrito"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void add(true)} style={styles.secondary}>
            <Text style={styles.body}>Comprar ahora</Text>
          </Pressable>
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

export function MobileCartScreen({
  session,
  onOpenProduct,
  onOpenQuote,
  onSignIn,
}: {
  session: AuthenticatedSession | null;
  onOpenProduct: (productId: string) => void;
  onOpenQuote: (quoteId: string) => void;
  onSignIn: () => void;
}) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [cart, setCart] = useState<CartView | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState({ state: "", city: "", municipality: "", reference: "" });
  const [pastedUrl, setPastedUrl] = useState("");

  useEffect(() => {
    if (!session) {
      setPhase("ready");
      setCart(null);
      return;
    }
    let cancelled = false;
    setPhase("loading");
    getCart(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setCart(next);
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
  }, [session, attempt]);

  async function mutate(action: (token: string) => Promise<CartView>): Promise<void> {
    if (!session) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setCart(await action(session.accessToken));
    } catch {
      setError("No pudimos actualizar el carrito.");
    } finally {
      setBusy(false);
    }
  }

  async function requestQuote(): Promise<void> {
    if (!session) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const quote = await createQuote(apiBase, session.accessToken, {
        address,
        ...(pastedUrl.trim().length > 0 ? { pastedUrl: pastedUrl.trim() } : {}),
      });
      onOpenQuote(quote.id);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 400 ? "Revisa la dirección y el enlace." : "No pudimos pedir la cotización.");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text accessibilityRole="header" style={styles.title}>
          Carrito
        </Text>
        <Text style={styles.body}>Entra para ver tu carrito.</Text>
        <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.primary}>
          <Text style={styles.primaryText}>Entrar</Text>
        </Pressable>
      </ScrollView>
    );
  }
  if (phase === "loading") {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.body}>Cargando…</Text>
      </ScrollView>
    );
  }
  if (phase === "error" || !cart) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.error}>No pudimos cargar el carrito.</Text>
        <Pressable accessibilityRole="button" onPress={() => setAttempt((current) => current + 1)} style={styles.primary}>
          <Text style={styles.primaryText}>Reintentar</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const activeCount = cart.groups.reduce((count, group) => count + group.items.length, 0);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Carrito
      </Text>
      {activeCount === 0 && cart.saved.length === 0 ? <Text style={styles.body}>Tu carrito está vacío.</Text> : null}
      {cart.groups.map((group) => (
        <View key={group.storeName}>
          <Text style={styles.heading}>{group.storeName}</Text>
          {group.items.map((item) => (
            <CartLine
              key={item.productId}
              item={item}
              busy={busy}
              saveLabel="Guardar para después"
              onOpen={() => onOpenProduct(item.productId)}
              onQuantity={(quantity) => void mutate((token) => setCartQuantity(apiBase, token, item.productId, quantity))}
              onRemove={() => void mutate((token) => removeCartItem(apiBase, token, item.productId))}
              onSave={() => void mutate((token) => saveCartItem(apiBase, token, item.productId, true))}
            />
          ))}
        </View>
      ))}
      {cart.saved.length > 0 ? <Text style={styles.heading}>Guardados para después</Text> : null}
      {cart.saved.map((item) => (
        <CartLine
          key={item.productId}
          item={item}
          busy={busy}
          saveLabel="Volver al carrito"
          onOpen={() => onOpenProduct(item.productId)}
          onQuantity={(quantity) => void mutate((token) => setCartQuantity(apiBase, token, item.productId, quantity))}
          onRemove={() => void mutate((token) => removeCartItem(apiBase, token, item.productId))}
          onSave={() => void mutate((token) => saveCartItem(apiBase, token, item.productId, false))}
        />
      ))}
      <View style={styles.summary}>
        <Text style={styles.heading}>Resumen del pedido</Text>
        <Text style={styles.body}>Subtotal: {subtotalLabel(cart.subtotal)}</Text>
        <Text style={styles.caption}>Envío en USA: por cotización</Text>
        <Text style={styles.caption}>Comisión del servicio: por cotización</Text>
        <Text style={styles.caption}>Envío a Venezuela: por cotización</Text>
        <Text style={styles.heading}>Total estimado</Text>
        <Text style={styles.body}>{subtotalLabel(cart.subtotal)}</Text>
        <Text style={styles.caption}>Sin montos inventados. El total final sale de la cotización revisada.</Text>
      </View>
      <Text style={styles.heading}>Dirección en Venezuela</Text>
      <Field label="Estado" value={address.state} onChange={(state) => setAddress({ ...address, state })} />
      <Field label="Ciudad" value={address.city} onChange={(city) => setAddress({ ...address, city })} />
      <Field label="Municipio" value={address.municipality} onChange={(municipality) => setAddress({ ...address, municipality })} />
      <Field label="Punto de referencia" value={address.reference} onChange={(reference) => setAddress({ ...address, reference })} />
      <Text style={styles.body}>Pegar un enlace</Text>
      <TextInput accessibilityLabel="Pegar un enlace" onChangeText={setPastedUrl} style={styles.input} value={pastedUrl} />
      <Text style={styles.caption}>La URL se guarda como texto. No la descargamos.</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void requestQuote()} style={styles.primary}>
        <Text style={styles.primaryText}>{busy ? "Espera…" : "Pedir cotización"}</Text>
      </Pressable>
      <Text style={styles.caption}>El pago llega después de que el equipo publique el importe.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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

function CartLine({
  item,
  busy,
  saveLabel,
  onOpen,
  onQuantity,
  onRemove,
  onSave,
}: {
  item: CartView["saved"][number];
  busy: boolean;
  saveLabel: string;
  onOpen: () => void;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onSave: () => void;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  return (
    <View style={styles.card}>
      <Text style={styles.badge}>Ficticio</Text>
      <Pressable accessibilityRole="button" onPress={onOpen}>
        <Text style={styles.heading}>{item.name}</Text>
      </Pressable>
      <Text style={styles.body}>{item.unitAmountMinor === null ? "Precio por cotización" : formatUsdFromMinor(item.unitAmountMinor)}</Text>
      <View style={styles.qtyRow}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            const next = Math.max(1, Number(quantity) - 1);
            setQuantity(String(next));
            onQuantity(next);
          }}
          style={styles.qtyButton}
        >
          <Text style={styles.body}>−</Text>
        </Pressable>
        <TextInput accessibilityLabel="Cantidad" keyboardType="number-pad" onChangeText={setQuantity} style={styles.qtyInput} value={quantity} />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            const next = Math.max(1, Number(quantity) + 1);
            setQuantity(String(next));
            onQuantity(next);
          }}
          style={styles.qtyButton}
        >
          <Text style={styles.body}>+</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => onQuantity(Number(quantity))} style={styles.secondary}>
        <Text style={styles.body}>Actualizar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onRemove} style={styles.secondary}>
        <Text style={styles.body}>Eliminar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onSave} style={styles.secondary}>
        <Text style={styles.body}>{saveLabel}</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View>
      <Text style={styles.body}>{label}</Text>
      <TextInput accessibilityLabel={label} onChangeText={onChange} style={styles.input} value={value} />
    </View>
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
});
