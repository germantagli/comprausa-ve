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

const colors = colorTokens.light;
const apiBase = "http://127.0.0.1:3001";

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
}: {
  session: AuthenticatedSession | null;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenProduct: (productId: string) => void;
}) {
  const greeting = useGreeting(session);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.brand}>CompraUSA VE</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {greeting}
      </Text>
      <Pressable accessibilityRole="button" onPress={onOpenCart} style={styles.linkHit}>
        <Text style={styles.link}>Carrito</Text>
      </Pressable>
      <SearchBox draft={draft} onChange={setDraft} onSubmit={() => setQuery(draft.trim())} />
      <NamedSection title="Categorías" empty="Todavía no hay categorías." failure="No pudimos cargar las categorías." load={() => listCatalogCategories(apiBase)} />
      <NamedSection title="Tiendas destacadas" empty="Todavía no hay tiendas internas." failure="No pudimos cargar las tiendas." load={() => listInternalStores(apiBase)} />
      <ProductSection query={query} onOpenProduct={onOpenProduct} />
      <View accessibilityLabel="De Estados Unidos a Venezuela" style={styles.banner}>
        <Text style={styles.bannerTitle}>De Estados Unidos a Venezuela</Text>
        <Text style={styles.bannerBody}>
          El catálogo de demostración no publica precios, existencia ni fechas de envío. La compra y el envío a Venezuela todavía no están en esta pantalla.
        </Text>
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
        Explorar
      </Text>
      <SearchBox draft={draft} onChange={setDraft} onSubmit={() => setQuery(draft.trim())} />
      <Text style={styles.body}>El único filtro del catálogo demo es el nombre.</Text>
      <ProductSection query={query} onOpenProduct={onOpenProduct} />
      <NamedSection title="Tiendas internas" empty="Todavía no hay tiendas internas." failure="No pudimos cargar las tiendas." load={() => listInternalStores(apiBase)} />
    </ScrollView>
  );
}

export function OrdersScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Pedidos
      </Text>
      <Text accessibilityLiveRegion="polite" style={styles.body}>
        No tienes pedidos activos.
      </Text>
    </ScrollView>
  );
}

export function ProfileScreen({
  session,
  onSignIn,
  onSignedOut,
  onHelp,
  onReview,
}: {
  session: AuthenticatedSession | null;
  onSignIn: () => void;
  onSignedOut: () => void;
  onHelp: () => void;
  onReview: () => void;
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

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Perfil
      </Text>
      {!session ? (
        <View>
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
        <View>
          <Text style={styles.body}>{displayName(phase.data)}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => void logout()} style={styles.primary}>
            <Text style={styles.primaryText}>{busy ? "Espera…" : "Cerrar sesión"}</Text>
          </Pressable>
          {logoutError ? (
            <Text accessibilityLiveRegion="assertive" style={styles.error}>
              {logoutError}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Pressable accessibilityRole="button" onPress={onReview} style={styles.linkHit}>
        <Text style={styles.link}>Revisión de pagos</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onHelp} style={styles.linkHit}>
        <Text style={styles.link}>Ayuda</Text>
      </Pressable>
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
        placeholderTextColor={colors.deep}
        style={styles.input}
        value={draft}
      />
      <Pressable accessibilityRole="button" onPress={onSubmit} style={styles.primary}>
        <Text style={styles.primaryText}>Buscar</Text>
      </Pressable>
    </View>
  );
}

function ProductSection({ query, onOpenProduct }: { query: string; onOpenProduct: (productId: string) => void }) {
  const load = useLoad(() => loadProducts(query), [query]);
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        Catálogo demo
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
                  <Text style={styles.badge}>Ficticio</Text>
                  <Text style={styles.heading}>{card.item.name}</Text>
                  <Text style={styles.body}>{catalogPriceLabel(card.pricing)}</Text>
                  <Text style={styles.body}>{card.availability.note}</Text>
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
}: {
  title: string;
  empty: string;
  failure: string;
  load: () => Promise<NamedCatalogList>;
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
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
  },
  title: {
    color: colors.text,
    fontSize: fontTokens.sizes.title,
    lineHeight: fontTokens.lineHeight.title,
    marginBottom: spaceTokens[3],
  },
  heading: {
    color: colors.text,
    fontSize: fontTokens.sizes.body,
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
    color: colors.text,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
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
    borderColor: colors.deep,
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
  },
  section: {
    marginTop: spaceTokens[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radiusTokens.md,
    marginBottom: spaceTokens[3],
    padding: spaceTokens[4],
  },
  badge: {
    alignSelf: "flex-start",
    borderColor: colors.deep,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontTokens.sizes.caption,
    marginBottom: spaceTokens[2],
    paddingHorizontal: spaceTokens[2],
    paddingVertical: 2,
  },
  banner: {
    backgroundColor: colors.deep,
    borderRadius: radiusTokens.lg,
    marginTop: spaceTokens[6],
    padding: spaceTokens[4],
  },
  bannerTitle: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[2],
  },
  bannerBody: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
  },
  error: {
    color: colors.error,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[3],
  },
});
