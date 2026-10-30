import {
  getCart,
  listCatalogCategories,
  probeServerReachable,
  searchCatalog,
  getCatalogPricing,
  type AuthenticatedSession,
  type CatalogPricing,
  type CatalogSummary,
  type NamedCatalogList,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME, homeFeaturedCategories } from "@comprausa/types";
import { catalogPriceLabel } from "@comprausa/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from "react-native";
import { apiBase } from "./api";

const colors = colorTokens.light;
const H_PAD = 16;

const topInset = Platform.select({
  ios: 48,
  android: (StatusBar.currentHeight ?? 0) + 8,
  default: 12,
})!;

const headerLogo = require("../assets/brand/logo-header.png");
const heroArt = require("../assets/images/home/hero-art.png");

const categoryIcons: Record<string, ImageSourcePropType> = {
  electronica: require("../assets/images/home/cat-electronica.png"),
  ropa: require("../assets/images/home/cat-ropa.png"),
  calzado: require("../assets/images/home/cat-calzado.png"),
  hogar: require("../assets/images/home/cat-hogar.png"),
  belleza: require("../assets/images/home/cat-belleza.png"),
  deportes: require("../assets/images/home/cat-deportes.png"),
};

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

type Featured = {
  id: string;
  name: string;
  priceLabel: string;
  disclaimer: string;
};

/**
 * TraeLo Home — own catalog, no partner store logos.
 * Featured products from /v1/catalog; prices only from pricing API.
 */
export function HomeScreen({
  session,
  serverReachable,
  onOpenCart,
  onOpenOrders,
  onOpenProfile,
  onOpenExplore,
  onOpenProduct,
  onOpenRequest,
}: {
  session: AuthenticatedSession | null;
  serverReachable: boolean | null;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenProfile: () => void;
  onOpenExplore: (query?: string) => void;
  onOpenProduct: (productId: string) => void;
  onOpenRequest: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, 430);
  const [draft, setDraft] = useState("");
  const [reachable, setReachable] = useState<boolean | null>(serverReachable);
  const [categories, setCategories] = useState<Load<NamedCatalogList>>({ status: "loading" });
  const [featured, setFeatured] = useState<Load<Featured[]>>({ status: "loading" });
  const [cartCount, setCartCount] = useState(0);

  const refresh = useCallback(async () => {
    setCategories({ status: "loading" });
    setFeatured({ status: "loading" });
    const ok = await probeServerReachable(apiBase);
    setReachable(ok);
    if (!ok) {
      setCategories({ status: "error", message: "Sin conexión con el servidor." });
      setFeatured({ status: "error", message: "Sin conexión con el servidor." });
      return;
    }
    try {
      const [categoryList, search] = await Promise.all([listCatalogCategories(apiBase), searchCatalog(apiBase, "")]);
      setCategories({ status: "ready", data: categoryList });
      const cards: Featured[] = [];
      for (const item of search.items) {
        cards.push(await toFeatured(item));
      }
      setFeatured({ status: "ready", data: cards });
    } catch {
      setCategories({ status: "error", message: "No pudimos cargar el catálogo." });
      setFeatured({ status: "error", message: "No pudimos cargar productos destacados." });
    }
    if (session?.accessToken) {
      try {
        const cart = await getCart(apiBase, session.accessToken);
        setCartCount(cart.groups.reduce((sum, group) => sum + group.items.reduce((inner, item) => inner + item.quantity, 0), 0));
      } catch {
        setCartCount(0);
      }
    } else {
      setCartCount(0);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setReachable(serverReachable);
  }, [serverReachable]);

  // Home labels follow the mock (Tecnología, Moda, …). API confirms category ids exist.
  const homeCategories = useMemo(() => {
    const apiIds = categories.status === "ready" ? new Set(categories.data.items.map((item) => item.id)) : null;
    return homeFeaturedCategories
      .filter((item) => apiIds === null || apiIds.has(item.id))
      .map((item) => ({ id: item.id, name: item.name }));
  }, [categories]);

  function requireServer(action: () => void): void {
    if (reachable !== true) {
      Alert.alert("Sin conexión", "No hay respuesta del servidor. Revisa la red e inténtalo de nuevo.", [
        { text: "Reintentar", onPress: () => void refresh() },
        { text: "Cerrar", style: "cancel" },
      ]);
      return;
    }
    action();
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset, width, alignSelf: "center" }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image source={headerLogo} accessibilityLabel={APP_BRAND_NAME} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Favoritos" onPress={() => requireServer(onOpenProfile)} style={styles.iconHit}>
              <Text style={styles.heart}>♡</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Notificaciones" onPress={() => requireServer(onOpenOrders)} style={styles.iconHit}>
              <Text style={styles.bell}>🔔</Text>
            </Pressable>
          </View>
        </View>

        {reachable === false ? (
          <Pressable onPress={() => void refresh()} style={styles.offline}>
            <Text style={styles.offlineText}>Sin conexión con el servidor. Toca para reintentar.</Text>
          </Pressable>
        ) : null}

        <View style={styles.searchShell}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            accessibilityLabel="Buscar productos en TraeLo"
            placeholder="Buscar productos en TraeLo..."
            placeholderTextColor="#8A97A8"
            value={draft}
            onChangeText={setDraft}
            returnKeyType="search"
            onSubmitEditing={() => requireServer(() => onOpenExplore(draft.trim() || undefined))}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              Tus compras de USA, directo a <Text style={styles.heroAccent}>Venezuela</Text>
            </Text>
            <Text style={styles.heroSub}>Miles de productos seleccionados para ti, con envío seguro.</Text>
            <Pressable accessibilityRole="button" onPress={() => requireServer(() => onOpenExplore())} style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Comprar ahora →</Text>
            </Pressable>
          </View>
          <Image source={heroArt} style={styles.heroArt} resizeMode="contain" accessibilityLabel="" />
        </View>

        <SectionHeader title="Categorías" onSeeAll={() => requireServer(() => onOpenExplore())} />
        {categories.status === "loading" ? <ActivityIndicator color={colors.primary} /> : null}
        {categories.status === "error" ? <Text style={styles.error}>{categories.message}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {homeCategories.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={category.name}
              onPress={() => requireServer(() => onOpenExplore(category.name))}
              style={styles.catItem}
            >
              <Image source={categoryIcons[category.id]} style={styles.catIcon} resizeMode="cover" />
              <Text style={styles.catLabel}>{category.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="Productos destacados" seeAll="Ver todos" onSeeAll={() => requireServer(() => onOpenExplore())} />
        {featured.status === "loading" ? <ActivityIndicator color={colors.primary} /> : null}
        {featured.status === "error" ? <Text style={styles.error}>{featured.message}</Text> : null}
        {featured.status === "ready" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
            {featured.data.map((product) => (
              <Pressable
                key={product.id}
                accessibilityRole="button"
                onPress={() => requireServer(() => onOpenProduct(product.id))}
                style={styles.productCard}
              >
                <View style={styles.productPhoto}>
                  <Text style={styles.demoBadge}>Demo</Text>
                  <Text style={styles.muted}>Sin foto</Text>
                </View>
                <Text numberOfLines={2} style={styles.productName}>
                  {product.name}
                </Text>
                <Text style={styles.productPrice}>{product.priceLabel}</Text>
                <Text style={styles.productMeta}>Sin valoración inventada</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.requestBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.requestTitle}>¿No encuentras un producto?</Text>
            <Text style={styles.requestBody}>Envíanos el enlace y te preparamos una cotización.</Text>
            <Pressable accessibilityRole="button" onPress={() => requireServer(onOpenRequest)} style={styles.requestCta}>
              <Text style={styles.requestCtaText}>Solicitar producto →</Text>
            </Pressable>
          </View>
          <View style={styles.requestArt}>
            <Text style={{ color: "#fff", fontSize: 20 }}>🔗</Text>
          </View>
        </View>

        <SectionHeader title="Ofertas especiales" onSeeAll={() => requireServer(() => onOpenExplore())} />
        <View style={styles.offerGrid}>
          <Pressable onPress={() => requireServer(() => onOpenExplore("Tecnología"))} style={[styles.offerCard, { backgroundColor: "#E8F1FF" }]}>
            <Image source={categoryIcons.electronica} style={styles.offerArt} resizeMode="contain" />
            <Text style={styles.offerTitle}>Electrónica con descuentos</Text>
            <Text style={styles.offerBody}>Explora tecnología del catálogo TraeLo.</Text>
            <Text style={styles.offerLink}>Ver ofertas →</Text>
          </Pressable>
          <Pressable onPress={() => requireServer(() => onOpenExplore("Moda"))} style={[styles.offerCard, { backgroundColor: "#FDE8F1" }]}>
            <Image source={categoryIcons.calzado} style={styles.offerArt} resizeMode="contain" />
            <Text style={styles.offerTitle}>Moda y calzado</Text>
            <Text style={styles.offerBody}>Las mejores marcas a un mejor precio.</Text>
            <Text style={[styles.offerLink, { color: "#C02670" }]}>Ver ofertas →</Text>
          </Pressable>
        </View>

        {cartCount > 0 ? (
          <Pressable onPress={onOpenCart}>
            <Text style={[styles.muted, { textAlign: "center", marginTop: 8 }]}>
              Tienes {cartCount} en el carrito →
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

async function toFeatured(item: CatalogSummary): Promise<Featured> {
  let pricing: CatalogPricing = { productId: item.id, status: "UNPRICED", amount: null, note: "Sin precio publicado." };
  try {
    pricing = await getCatalogPricing(apiBase, item.id);
  } catch {
    /* keep unpriced */
  }
  return {
    id: item.id,
    name: item.name,
    priceLabel: catalogPriceLabel(pricing),
    disclaimer: item.disclaimer,
  };
}

function SectionHeader({ title, onSeeAll, seeAll = "Ver todas" }: { title: string; onSeeAll: () => void; seeAll?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onSeeAll} hitSlop={6}>
        <Text style={styles.seeAll}>{seeAll}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#FFFFFF", flex: 1 },
  scroll: { gap: 16, paddingBottom: 24, paddingHorizontal: H_PAD },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 36 },
  logo: { height: 28, width: 118 },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 2 },
  iconHit: { alignItems: "center", height: 36, justifyContent: "center", position: "relative", width: 36 },
  heart: { color: colors.primary, fontSize: 22, lineHeight: 26 },
  bell: { fontSize: 18, lineHeight: 24 },
  offline: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    padding: 10,
  },
  offlineText: { color: "#991B1B", fontSize: fontTokens.sizes.caption, fontWeight: "600" },
  searchShell: {
    alignItems: "center",
    backgroundColor: "#F1F4F8",
    borderColor: "#E4EAF1",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  searchGlyph: { color: "#8A97A8", fontSize: 18 },
  searchInput: { color: colors.deep, flex: 1, fontSize: 15, paddingVertical: Platform.OS === "ios" ? 11 : 8 },
  hero: {
    alignItems: "center",
    backgroundColor: "#2F7BE8",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  heroCopy: { flex: 1 },
  heroTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "800", letterSpacing: -0.3, lineHeight: 24, marginBottom: 6 },
  heroAccent: { color: colors.accent },
  heroSub: { color: "rgba(255,255,255,0.92)", fontSize: 13, lineHeight: 18, marginBottom: 12 },
  heroCta: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  heroCtaText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  heroArt: { height: 110, width: 110 },
  sectionHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: -6 },
  sectionTitle: { color: colors.deep, fontSize: 17, fontWeight: "800" },
  seeAll: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  catRow: { gap: 12, paddingVertical: 4 },
  catItem: { alignItems: "center", width: 72 },
  catIcon: { borderRadius: 14, height: 68, marginBottom: 6, width: 68 },
  catLabel: { color: colors.deep, fontSize: 11, fontWeight: "600", textAlign: "center" },
  productRow: { gap: 12, paddingVertical: 4 },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8EEF5",
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    width: 148,
  },
  productPhoto: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: "#F5F8FC",
    borderRadius: 10,
    justifyContent: "center",
    marginBottom: 8,
    position: "relative",
  },
  demoBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    color: "#B91C1C",
    fontSize: 10,
    fontWeight: "700",
    left: 6,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: 6,
  },
  productName: { color: colors.deep, fontSize: 13, fontWeight: "700", marginBottom: 4 },
  productPrice: { color: colors.primary, fontSize: 14, fontWeight: "800", marginBottom: 2 },
  productMeta: { color: colors.muted, fontSize: 11 },
  requestBanner: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  requestTitle: { color: colors.deep, fontSize: 16, fontWeight: "800", marginBottom: 4 },
  requestBody: { color: colors.deep, fontSize: 13, lineHeight: 18, marginBottom: 10, opacity: 0.85 },
  requestCta: {
    alignSelf: "flex-start",
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  requestCtaText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  requestArt: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  offerGrid: { flexDirection: "row", gap: 10 },
  offerCard: { borderRadius: 14, flex: 1, padding: 14 },
  offerArt: { height: 48, marginBottom: 8, width: 48 },
  offerTitle: { color: colors.deep, fontSize: 14, fontWeight: "800", marginBottom: 4 },
  offerBody: { color: colors.muted, fontSize: 12, lineHeight: 16, marginBottom: 8 },
  offerLink: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: fontTokens.sizes.caption },
  error: { color: "#991B1B", fontSize: fontTokens.sizes.caption },
});
