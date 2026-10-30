import {
  listCatalogCategories,
  listInternalStores,
  probeServerReachable,
  type AuthenticatedSession,
  type NamedCatalogList,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME } from "@comprausa/types";
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
const SECTION_GAP = 16;
const STORE_GAP = 8;
const HOME_CATEGORY_IDS = ["electronica", "ropa", "calzado", "hogar"] as const;

const topInset = Platform.select({
  ios: 48,
  android: (StatusBar.currentHeight ?? 0) + 8,
  default: 12,
})!;

const headerLogo = require("../assets/brand/logo-header.png");
const bannerMiles = require("../assets/images/home/banner-miles.png");
const bannerDescuentos = require("../assets/images/home/banner-descuentos.png");

const storeLogos: Record<string, ImageSourcePropType> = {
  amazon: require("../assets/images/home/store-amazon.png"),
  walmart: require("../assets/images/home/store-walmart.png"),
  ebay: require("../assets/images/home/store-ebay.png"),
  shein: require("../assets/images/home/store-shein.png"),
  nike: require("../assets/images/home/store-nike.png"),
  "best-buy": require("../assets/images/home/store-bestbuy.png"),
  target: require("../assets/images/home/store-target.png"),
  apple: require("../assets/images/home/store-apple.png"),
};

const categoryIcons: Record<string, ImageSourcePropType> = {
  electronica: require("../assets/images/home/cat-electronica.png"),
  ropa: require("../assets/images/home/cat-ropa.png"),
  calzado: require("../assets/images/home/cat-calzado.png"),
  hogar: require("../assets/images/home/cat-hogar.png"),
  belleza: require("../assets/images/home/cat-belleza.png"),
  deportes: require("../assets/images/home/cat-deportes.png"),
  juguetes: require("../assets/images/home/cat-juguetes.png"),
  supermercado: require("../assets/images/home/cat-supermercado.png"),
  videojuegos: require("../assets/images/home/cat-videojuegos.png"),
  herramientas: require("../assets/images/home/cat-herramientas.png"),
};

type DirectoryLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NamedCatalogList };

/**
 * TraeLo Home — Expo (iOS/Android). Layout mirrors the approved mock:
 * compact header, search, hero, 4×2 stores, 4 primary categories, offers banner.
 */
export function HomeScreen({
  session: _session,
  serverReachable,
  onOpenCart: _onOpenCart,
  onOpenOrders,
  onOpenProfile,
  onOpenExplore,
  onOpenWishlist,
}: {
  session: AuthenticatedSession | null;
  serverReachable: boolean | null;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenProfile: () => void;
  onOpenExplore: (query?: string) => void;
  onOpenWishlist?: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, 430);
  const inner = width - H_PAD * 2;
  const storeTile = Math.floor((inner - STORE_GAP * 3) / 4);
  const catTile = Math.floor((inner - 10 * 3) / 4);

  const [draft, setDraft] = useState("");
  const [stores, setStores] = useState<DirectoryLoad>({ status: "loading" });
  const [categories, setCategories] = useState<DirectoryLoad>({ status: "loading" });
  const [reachable, setReachable] = useState<boolean | null>(serverReachable);

  const refreshDirectory = useCallback(async () => {
    setStores({ status: "loading" });
    setCategories({ status: "loading" });
    const ok = await probeServerReachable(apiBase);
    setReachable(ok);
    if (!ok) {
      setStores({ status: "error", message: "Sin conexión con el servidor." });
      setCategories({ status: "error", message: "Sin conexión con el servidor." });
      return;
    }
    try {
      const [storeList, categoryList] = await Promise.all([listInternalStores(apiBase), listCatalogCategories(apiBase)]);
      setStores({ status: "ready", data: storeList });
      setCategories({ status: "ready", data: categoryList });
    } catch {
      setStores({ status: "error", message: "No pudimos cargar las tiendas." });
      setCategories({ status: "error", message: "No pudimos cargar las categorías." });
    }
  }, []);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory]);

  useEffect(() => {
    setReachable(serverReachable);
  }, [serverReachable]);

  const homeCategories = useMemo(() => {
    if (categories.status !== "ready") {
      return [];
    }
    const byId = new Map(categories.data.items.map((item) => [item.id, item]));
    return HOME_CATEGORY_IDS.map((id) => byId.get(id)).filter((item): item is { id: string; name: string } => Boolean(item));
  }, [categories]);

  function requireServer(action: () => void): void {
    if (reachable !== true) {
      Alert.alert("Sin conexión", "No hay respuesta del servidor. Revisa la red e inténtalo de nuevo antes de continuar.", [
        { text: "Reintentar", onPress: () => void refreshDirectory() },
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
        bounces={false}
      >
        <View style={styles.header}>
          <Image source={headerLogo} accessibilityLabel={APP_BRAND_NAME} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Favoritos"
              hitSlop={8}
              onPress={() => requireServer(() => (onOpenWishlist ? onOpenWishlist() : onOpenProfile()))}
              style={styles.iconHit}
            >
              <Text style={styles.heart}>♡</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notificaciones"
              hitSlop={8}
              onPress={() => requireServer(onOpenOrders)}
              style={styles.iconHit}
            >
              <Text style={styles.bell}>🔔</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>0</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {reachable === false ? (
          <Pressable accessibilityRole="button" onPress={() => void refreshDirectory()} style={styles.offline}>
            <Text style={styles.offlineText}>Sin conexión con el servidor. Toca para reintentar.</Text>
          </Pressable>
        ) : null}

        <View style={styles.searchShell}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            accessibilityLabel="Buscar productos, marcas, tiendas"
            placeholder="Buscar productos, marcas, tiendas..."
            placeholderTextColor="#8A97A8"
            value={draft}
            onChangeText={setDraft}
            returnKeyType="search"
            onSubmitEditing={() => requireServer(() => onOpenExplore(draft.trim() || undefined))}
            style={styles.searchInput}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Miles de productos de USA. Ver ofertas"
          onPress={() => requireServer(() => onOpenExplore())}
          style={styles.bannerWrap}
        >
          <Image source={bannerMiles} style={[styles.banner, { width: inner }]} resizeMode="contain" />
        </Pressable>

        <SectionHeader title="Tiendas populares" onSeeAll={() => requireServer(() => onOpenExplore())} />
        {stores.status === "loading" ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null}
        {stores.status === "error" ? <Text style={styles.error}>{stores.message}</Text> : null}
        {stores.status === "ready" ? (
          <View style={styles.storeGrid}>
            {stores.data.items.slice(0, 8).map((store) => {
              const logo = storeLogos[store.id];
              return (
                <Pressable
                  key={store.id}
                  accessibilityRole="button"
                  accessibilityLabel={store.name}
                  onPress={() => requireServer(() => onOpenExplore(store.name))}
                  style={[styles.storeTile, { width: storeTile, height: storeTile }]}
                >
                  {logo ? (
                    <Image source={logo} style={styles.storeLogo} resizeMode="contain" />
                  ) : (
                    <Text style={styles.storeFallback}>{store.name}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <SectionHeader title="Categorías" onSeeAll={() => requireServer(() => onOpenExplore())} />
        {categories.status === "loading" ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null}
        {categories.status === "error" ? <Text style={styles.error}>{categories.message}</Text> : null}
        {categories.status === "ready" ? (
          <View style={styles.catGrid}>
            {homeCategories.map((category) => {
              const icon = categoryIcons[category.id];
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  onPress={() => requireServer(() => onOpenExplore(category.name))}
                  style={[styles.catItem, { width: catTile }]}
                >
                  {icon ? (
                    <Image source={icon} style={[styles.catIcon, { width: catTile, height: catTile }]} resizeMode="cover" />
                  ) : (
                    <View style={[styles.catIcon, styles.catFallback, { width: catTile, height: catTile }]}>
                      <Text style={styles.catFallbackText}>{category.name.slice(0, 1)}</Text>
                    </View>
                  )}
                  <Text numberOfLines={2} style={styles.catLabel}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Descuentos especiales. Ver todas"
          onPress={() => requireServer(() => onOpenExplore())}
          style={[styles.bannerWrap, { marginTop: 4 }]}
        >
          <Image
            source={bannerDescuentos}
            style={[styles.bannerSecondary, { width: inner }]}
            resizeMode="cover"
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ver todas · ${title}`} onPress={onSeeAll} hitSlop={6}>
        <Text style={styles.seeAll}>Ver todas</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  scroll: {
    gap: SECTION_GAP,
    paddingBottom: 20,
    paddingHorizontal: H_PAD,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
  },
  logo: {
    height: 28,
    width: 118,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  iconHit: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    position: "relative",
    width: 36,
  },
  heart: {
    color: colors.primary,
    fontSize: 22,
    lineHeight: 26,
  },
  bell: {
    fontSize: 18,
    lineHeight: 24,
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#E11D48",
    borderRadius: 999,
    height: 15,
    justifyContent: "center",
    minWidth: 15,
    paddingHorizontal: 3,
    position: "absolute",
    right: 0,
    top: 0,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  offline: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    padding: 10,
  },
  offlineText: {
    color: "#991B1B",
    fontSize: fontTokens.sizes.caption,
    fontWeight: "600",
  },
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
  searchGlyph: {
    color: "#8A97A8",
    fontSize: 18,
  },
  searchInput: {
    color: colors.deep,
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
  },
  bannerWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  banner: {
    aspectRatio: 1750 / 698,
    borderRadius: 16,
  },
  bannerSecondary: {
    aspectRatio: 854 / 312,
    borderRadius: 16,
    maxHeight: 118,
  },
  sectionHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: -6,
  },
  sectionTitle: {
    color: colors.deep,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  seeAll: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: STORE_GAP,
  },
  storeTile: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8EEF5",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: 4,
  },
  storeLogo: {
    height: "78%",
    width: "78%",
  },
  storeFallback: {
    color: colors.deep,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  catItem: {
    alignItems: "center",
  },
  catIcon: {
    borderRadius: 14,
    marginBottom: 6,
  },
  catFallback: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    justifyContent: "center",
  },
  catFallbackText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "800",
  },
  catLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    textAlign: "center",
  },
  error: {
    color: "#991B1B",
    fontSize: fontTokens.sizes.caption,
  },
});
