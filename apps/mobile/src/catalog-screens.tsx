import {
  ApiClientError,
  getAccountProfile,
  getCatalogAvailability,
  getCatalogPricing,
  listCatalogCategories,
  listInternalStores,
  revokeSession,
  searchCatalog,
  type AccountProfile,
  type AuthenticatedSession,
  type CatalogAvailability,
  type CatalogPricing,
  type CatalogSummary,
  type NamedCatalogList,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { catalogPriceLabel } from "@comprausa/utils";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiBase } from "./api";
import { MobileOrdersScreen } from "./tracking-screens";

const colors = colorTokens.light;

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

interface ProductCardData {
  item: CatalogSummary;
  pricing: CatalogPricing;
  availability: CatalogAvailability;
}

export function HomeScreen({
  session,
  onOpenCart,
  onOpenOrders,
  onOpenProduct,
  onOpenStores,
}: {
  session: AuthenticatedSession | null;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenProduct: (productId: string) => void;
  onOpenStores: () => void;
}) {
  const greeting = useGreeting(session);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.brand}>TraeLo</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {greeting}
      </Text>
      <SearchBox draft={draft} onChange={setDraft} onSubmit={() => setQuery(draft.trim())} />
      <View accessibilityLabel="Compra en USA, recíbelo en Venezuela" style={styles.banner}>
        <Text style={styles.bannerTitle}>Compra en tus tiendas favoritas de USA. Recíbelo en Venezuela.</Text>
        <Text style={styles.bannerBody}>
          Cotizamos el pedido y el envío. El catálogo demo no publica precios, existencia ni fechas.
        </Text>
        <View style={styles.bannerActions}>
          <Pressable accessibilityRole="button" onPress={onOpenStores} style={styles.bannerPrimary}>
            <Text style={styles.primaryText}>Ver tiendas</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onOpenCart} style={styles.bannerSecondary}>
            <Text style={styles.bannerSecondaryText}>Carrito</Text>
          </Pressable>
        </View>
      </View>
      <NamedSection
        title="Tiendas destacadas"
        empty="Todavía no hay tiendas internas."
        failure="No pudimos cargar las tiendas."
        load={() => listInternalStores(apiBase)}
        chips
      />
      <NamedSection
        title="Categorías populares"
        empty="Todavía no hay categorías."
        failure="No pudimos cargar las categorías."
        load={() => listCatalogCategories(apiBase)}
        circles
      />
      <ProductSection query={query} title="Ofertas destacadas" onOpenProduct={onOpenProduct} />
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          Cómo funciona
        </Text>
        {[
          "Busca en el catálogo demo o pega un enlace de USA.",
          "Pedimos cotización: el importe lo escribe el equipo.",
          "Pagas en USD y seguimos el envío a Venezuela.",
        ].map((step, index) => (
          <View key={step} style={styles.stepCard}>
            <Text style={styles.stepIndex}>{index + 1}</Text>
            <Text style={styles.body}>{step}</Text>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={onOpenOrders} style={styles.linkHit}>
        <Text style={styles.link}>Ver pedidos activos</Text>
      </Pressable>
    </ScrollView>
  );
}

export function ExploreScreen({ onOpenProduct }: { onOpenProduct: (productId: string) => void }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Tiendas y catálogo
      </Text>
      <Text style={styles.caption}>Sin logos de marcas externas. Solo catálogo demo e internas.</Text>
      <SearchBox draft={draft} onChange={setDraft} onSubmit={() => setQuery(draft.trim())} />
      <Text style={styles.body}>El único filtro del catálogo demo es el nombre.</Text>
      <NamedSection
        title="Tiendas internas"
        empty="Todavía no hay tiendas internas."
        failure="No pudimos cargar las tiendas."
        load={() => listInternalStores(apiBase)}
        chips
      />
      <ProductSection query={query} title="Resultados" onOpenProduct={onOpenProduct} />
    </ScrollView>
  );
}

export function OrdersScreen({ session }: { session: AuthenticatedSession | null }) {
  return <MobileOrdersScreen session={session} />;
}

export function ProfileScreen({
  session,
  onSignIn,
  onSignedOut,
  onHelp,
  onOrders,
  onReview,
  onTrack,
}: {
  session: AuthenticatedSession | null;
  onSignIn: () => void;
  onSignedOut: () => void;
  onHelp: () => void;
  onOrders: () => void;
  onReview: () => void;
  onTrack: () => void;
}) {
  const [phase, setPhase] = useState<Load<AccountProfile>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setPhase({ status: "ready", data: { givenName: null, familyName: null, role: "CUSTOMER", mfaSatisfied: false } });
      return;
    }
    let cancelled = false;
    setPhase({ status: "loading" });
    getAccountProfile(apiBase, session.accessToken)
      .then((profile) => {
        if (!cancelled) {
          setPhase({ status: "ready", data: profile });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase({ status: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session, attempt]);

  async function logout(): Promise<void> {
    if (!session) {
      onSignedOut();
      return;
    }
    setBusy(true);
    setLogoutError(null);
    try {
      await revokeSession(apiBase, session.accessToken);
      onSignedOut();
    } catch (caught) {
      setLogoutError(caught instanceof ApiClientError ? "No pudimos cerrar la sesión." : "No pudimos cerrar la sesión.");
    } finally {
      setBusy(false);
    }
  }

  const menu: readonly { label: string; note?: string; onPress: () => void }[] = [
    { label: "Mis pedidos", onPress: onOrders },
    { label: "Revisión de pagos", note: "Cola interna del operador.", onPress: onReview },
    { label: "Seguimiento de pedidos", note: "Cola y línea de tiempo del operador.", onPress: onTrack },
    { label: "Direcciones", note: "La dirección se pide al cotizar.", onPress: onHelp },
    { label: "Métodos de pago", note: "Disponibles en la cotización aceptada.", onPress: onHelp },
    { label: "Favoritos", note: "Todavía no está disponible.", onPress: onHelp },
    { label: "Notificaciones", note: "Todavía no está disponible.", onPress: onHelp },
    { label: "Ayuda", onPress: onHelp },
    { label: "Configuración", note: "Todavía no está disponible.", onPress: onHelp },
  ];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Perfil
      </Text>
      {!session ? (
        <View style={styles.card}>
          <Text style={styles.body}>Entra para ver tu nombre.</Text>
          <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.primary}>
            <Text style={styles.primaryText}>Entrar</Text>
          </Pressable>
        </View>
      ) : null}
      {session && phase.status === "loading" ? (
        <Text accessibilityState={{ busy: true }} style={styles.body}>
          Cargando…
        </Text>
      ) : null}
      {session && phase.status === "error" ? (
        <View>
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            No pudimos cargar tu perfil.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((current) => current + 1)} style={styles.primary}>
            <Text style={styles.primaryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {session && phase.status === "ready" ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{displayName(phase.data)}</Text>
          <Text style={styles.caption}>Cuenta TraeLo</Text>
        </View>
      ) : null}
      {menu.map((item) => (
        <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} style={styles.menuRow}>
          <Text style={styles.heading}>{item.label}</Text>
          {item.note ? <Text style={styles.caption}>{item.note}</Text> : null}
        </Pressable>
      ))}
      {session && phase.status === "ready" ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={() => void logout()}
            style={styles.logout}
          >
            <Text style={styles.logoutText}>{busy ? "Espera…" : "Cerrar sesión"}</Text>
          </Pressable>
          {logoutError ? (
            <Text accessibilityLiveRegion="assertive" style={styles.error}>
              {logoutError}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

export function HelpScreen({ onReplay }: { onReplay: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Ayuda
      </Text>
      <Text style={styles.body}>Puedes volver a ver la introducción de tres pasos.</Text>
      <Pressable accessibilityRole="button" onPress={onReplay} style={styles.primary}>
        <Text style={styles.primaryText}>Ver la introducción de nuevo</Text>
      </Pressable>
      <Text style={styles.body}>Espacio para un video externo. No hay uno cargado.</Text>
    </ScrollView>
  );
}

function SearchBox({ draft, onChange, onSubmit }: { draft: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <View>
      <Text style={styles.body}>Buscar</Text>
      <TextInput
        accessibilityLabel="Buscar"
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="Busca en el catálogo de demostración"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={draft}
      />
      <Pressable accessibilityRole="button" onPress={onSubmit} style={styles.primary}>
        <Text style={styles.primaryText}>Buscar</Text>
      </Pressable>
    </View>
  );
}

function ProductSection({
  query,
  title,
  onOpenProduct,
}: {
  query: string;
  title: string;
  onOpenProduct: (productId: string) => void;
}) {
  const load = useLoad(() => loadProducts(query), [query]);
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        {title}
      </Text>
      <Region
        load={load}
        failure="No pudimos cargar el catálogo."
        render={(cards) =>
          cards.length === 0 ? (
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              {query.trim().length > 0
                ? "Ningún artículo del catálogo demo coincide con esa búsqueda."
                : "Todavía no hay artículos en el catálogo demo."}
            </Text>
          ) : (
            <View>
              {cards.map((card) => (
                <Pressable key={card.item.id} accessibilityRole="button" onPress={() => onOpenProduct(card.item.id)} style={styles.card}>
                  <View style={styles.photoSlot}>
                    <Text style={styles.caption}>Sin foto</Text>
                  </View>
                  <Text style={styles.badge}>Ficticio</Text>
                  <Text style={styles.heading}>{card.item.name}</Text>
                  <Text style={styles.price}>{catalogPriceLabel(card.pricing)}</Text>
                  <Text style={styles.caption}>{card.availability.note}</Text>
                  <Text style={styles.caption}>{card.item.disclaimer}</Text>
                </Pressable>
              ))}
            </View>
          )
        }
      />
    </View>
  );
}

function NamedSection({
  title,
  empty,
  failure,
  load,
  chips = false,
  circles = false,
}: {
  title: string;
  empty: string;
  failure: string;
  load: () => Promise<NamedCatalogList>;
  chips?: boolean;
  circles?: boolean;
}) {
  const state = useLoad(load, [title]);
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        {title}
      </Text>
      <Region
        load={state}
        failure={failure}
        render={(data) =>
          data.items.length === 0 ? (
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              {empty}
            </Text>
          ) : circles ? (
            <View style={styles.circleRow}>
              {data.items.map((item) => (
                <View key={item.id} style={styles.circleItem}>
                  <View style={styles.circle}>
                    <Text style={styles.circleLetter}>{item.name.slice(0, 1).toLocaleUpperCase("es")}</Text>
                  </View>
                  <Text style={styles.circleLabel}>{item.name}</Text>
                </View>
              ))}
            </View>
          ) : chips ? (
            <View style={styles.chipRow}>
              {data.items.map((item) => (
                <View key={item.id} style={styles.chip}>
                  <Text style={styles.chipText}>{item.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View>
              {data.items.map((item) => (
                <Text key={item.id} style={styles.body}>
                  {item.name}
                </Text>
              ))}
            </View>
          )
        }
      />
    </View>
  );
}

function Region<T>({
  load,
  failure,
  render,
}: {
  load: { phase: Load<T>; retry: () => void };
  failure: string;
  render: (data: T) => ReactNode;
}) {
  if (load.phase.status === "loading") {
    return (
      <Text accessibilityState={{ busy: true }} style={styles.body}>
        Cargando…
      </Text>
    );
  }
  if (load.phase.status === "error") {
    return (
      <View>
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {failure}
        </Text>
        <Pressable accessibilityRole="button" onPress={load.retry} style={styles.primary}>
          <Text style={styles.primaryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }
  return render(load.phase.data);
}

function useGreeting(session: AuthenticatedSession | null): string {
  const [greeting, setGreeting] = useState("Hola");
  useEffect(() => {
    if (!session) {
      setGreeting("Hola");
      return;
    }
    let cancelled = false;
    getAccountProfile(apiBase, session.accessToken)
      .then((profile) => {
        const name = profile.givenName?.trim();
        if (!cancelled) {
          setGreeting(name ? `Hola, ${name}` : "Hola");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGreeting("Hola");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session]);
  return greeting;
}

function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]): { phase: Load<T>; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Load<T>>({ status: "loading" });
  const key = JSON.stringify(deps);
  useEffect(() => {
    let cancelled = false;
    setPhase({ status: "loading" });
    load()
      .then((data) => {
        if (!cancelled) {
          setPhase({ status: "ready", data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase({ status: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
    // The key serializes the declared inputs for this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, key]);
  return { phase, retry: () => setAttempt((current) => current + 1) };
}

async function loadProducts(query: string): Promise<ProductCardData[]> {
  const result = await searchCatalog(apiBase, query);
  return Promise.all(
    result.items.map(async (item) => {
      const [pricing, availability] = await Promise.all([
        getCatalogPricing(apiBase, item.id),
        getCatalogAvailability(apiBase, item.id),
      ]);
      return { item, pricing, availability };
    }),
  );
}

function displayName(profile: AccountProfile): string {
  const parts = [profile.givenName, profile.familyName].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  return parts.length > 0 ? parts.join(" ") : "Tu perfil no tiene nombre.";
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    padding: spaceTokens[4],
    paddingBottom: spaceTokens[8],
  },
  brand: {
    color: colors.deep,
    fontSize: fontTokens.sizes.title,
    fontWeight: "800",
    lineHeight: fontTokens.lineHeight.title,
  },
  title: {
    color: colors.text,
    fontSize: fontTokens.sizes.title,
    fontWeight: "700",
    lineHeight: fontTokens.lineHeight.title,
    marginBottom: spaceTokens[3],
    marginTop: spaceTokens[2],
  },
  heading: {
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[2],
  },
  body: {
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[3],
  },
  caption: {
    color: colors.muted,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
    marginBottom: spaceTokens[2],
  },
  price: {
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[2],
  },
  link: {
    color: colors.primary,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
  },
  linkHit: {
    justifyContent: "center",
    minHeight: 44,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontTokens.sizes.body,
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
  primaryText: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    fontWeight: "600",
  },
  secondary: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: spaceTokens[3],
    marginRight: spaceTokens[2],
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  section: {
    marginTop: spaceTokens[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    marginBottom: spaceTokens[3],
    padding: spaceTokens[4],
  },
  photoSlot: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radiusTokens.sm,
    justifyContent: "center",
    marginBottom: spaceTokens[3],
    minHeight: 120,
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
    paddingVertical: 2,
  },
  banner: {
    backgroundColor: colors.deep,
    borderRadius: radiusTokens.lg,
    marginBottom: spaceTokens[2],
    marginTop: spaceTokens[2],
    padding: spaceTokens[4],
  },
  bannerTitle: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.title,
    fontWeight: "700",
    lineHeight: fontTokens.lineHeight.title,
    marginBottom: spaceTokens[2],
  },
  bannerBody: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[3],
  },
  bannerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spaceTokens[2],
  },
  bannerPrimary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  bannerSecondary: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  bannerSecondaryText: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    fontWeight: "600",
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spaceTokens[3],
    marginBottom: spaceTokens[3],
    padding: spaceTokens[4],
  },
  stepIndex: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    color: colors.primaryOn,
    fontWeight: "700",
    height: 32,
    lineHeight: 32,
    overflow: "hidden",
    textAlign: "center",
    width: 32,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spaceTokens[2],
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spaceTokens[3],
  },
  chipText: {
    color: colors.text,
    fontSize: fontTokens.sizes.caption,
    fontWeight: "600",
  },
  circleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spaceTokens[3],
  },
  circleItem: {
    alignItems: "center",
    width: 72,
  },
  circle: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 36,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    marginBottom: spaceTokens[2],
    width: 72,
  },
  circleLetter: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  circleLabel: {
    color: colors.text,
    fontSize: fontTokens.sizes.caption,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spaceTokens[2],
  },
  timelineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spaceTokens[3],
    marginBottom: spaceTokens[2],
  },
  timelineDot: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  menuRow: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    minHeight: 56,
    paddingHorizontal: spaceTokens[4],
    paddingVertical: spaceTokens[3],
  },
  logout: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spaceTokens[4],
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  logoutText: {
    color: colors.error,
    fontSize: fontTokens.sizes.body,
    fontWeight: "600",
  },
  error: {
    color: colors.error,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[3],
  },
});
