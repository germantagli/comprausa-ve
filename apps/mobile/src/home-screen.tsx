import {
  listCatalogCategories,
  listInternalStores,
  probeServerReachable,
  type AuthenticatedSession,
  type NamedCatalogList,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME } from "@comprausa/types";
import { useCallback, useEffect, useState } from "react";
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

const topInset = Platform.select({
  ios: 52,
  android: (StatusBar.currentHeight ?? 0) + spaceTokens[3],
  default: spaceTokens[4],
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

export function HomeScreen({
  session,
  serverReachable,
  onOpenCart,
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
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 480);
  const pad = spaceTokens[4];
  const storeGap = spaceTokens[2];
  const storeTile = Math.floor((contentWidth - pad * 2 - storeGap * 3) / 4);
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

  function requireServer(action: () => void): void {
    if (reachable !== true) {
      Alert.alert(
        "Sin conexión",
        "No hay respuesta del servidor. Revisa la red e inténtalo de nuevo antes de continuar.",
        [
          { text: "Reintentar", onPress: () => void refreshDirectory() },
          { text: "Cerrar", style: "cancel" },
        ],
      );
      return;
    }
    action();
  }

  const greeting = session ? "Hola" : `Bienvenido a ${APP_BRAND_NAME}`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset, width: contentWidth, alignSelf: "center" }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
              <Text style={styles.headerIcon}>♡</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notificaciones"
              hitSlop={8}
              onPress={() => requireServer(onOpenOrders)}
              style={styles.iconHit}
            >
              <Text style={styles.headerIcon}>🔔</Text>
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
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={setDraft}
            returnKeyType="search"
            onSubmitEditing={() => requireServer(() => onOpenExplore(draft.trim() || undefined))}
            style={styles.searchInput}
          />
        </View>

        <Text style={styles.srOnly}>{greeting}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Miles de productos de USA. Ver ofertas"
          onPress={() => requireServer(() => onOpenExplore())}
          style={styles.bannerWrap}
        >
          <Image source={bannerMiles} style={[styles.banner, { width: contentWidth - pad * 2 }]} resizeMode="cover" />
        </Pressable>

        <SectionHeader title="Tiendas populares" onSeeAll={() => requireServer(() => onOpenExplore())} />
        {stores.status === "loading" ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spaceTokens[4] }} />
        ) : null}
        {stores.status === "error" ? <Text style={styles.error}>{stores.message}</Text> : null}
        {stores.status === "ready" ? (
          <View style={[styles.storeGrid, { gap: storeGap }]}>
            {stores.data.items.map((store) => {
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
        {categories.status === "loading" ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spaceTokens[3] }} />
        ) : null}
        {categories.status === "error" ? <Text style={styles.error}>{categories.message}</Text> : null}
        {categories.status === "ready" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {categories.data.items.map((category) => {
              const icon = categoryIcons[category.id];
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  onPress={() => requireServer(() => onOpenExplore(category.name))}
                  style={styles.catItem}
                >
                  {icon ? (
                    <Image source={icon} style={styles.catIcon} resizeMode="cover" />
                  ) : (
                    <View style={[styles.catIcon, styles.catFallback]}>
                      <Text style={styles.catFallbackText}>{category.name.slice(0, 1)}</Text>
                    </View>
                  )}
                  <Text numberOfLines={2} style={styles.catLabel}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Descuentos especiales. Ver todas"
          onPress={() => requireServer(() => onOpenExplore())}
          style={[styles.bannerWrap, { marginTop: spaceTokens[6] }]}
        >
          <Image source={bannerDescuentos} style={[styles.bannerSecondary, { width: contentWidth - pad * 2 }]} resizeMode="cover" />
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => requireServer(onOpenCart)} style={styles.footerLink}>
          <Text style={styles.link}>Ir al carrito</Text>
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
      <Pressable accessibilityRole="button" accessibilityLabel={`Ver todas · ${title}`} onPress={onSeeAll}>
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
    paddingBottom: spaceTokens[6],
    paddingHorizontal: spaceTokens[4],
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spaceTokens[3],
    minHeight: 44,
  },
  logo: {
    height: 36,
    width: 140,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spaceTokens[2],
  },
  iconHit: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    position: "relative",
    width: 40,
  },
  headerIcon: {
    color: colors.deep,
    fontSize: 22,
    lineHeight: 28,
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#E11D48",
    borderRadius: 999,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 3,
    position: "absolute",
    right: 2,
    top: 2,
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
    marginBottom: spaceTokens[3],
    padding: spaceTokens[3],
  },
  offlineText: {
    color: "#991B1B",
    fontSize: fontTokens.sizes.caption,
    fontWeight: "600",
  },
  searchShell: {
    alignItems: "center",
    borderColor: "#D7E0EC",
    borderRadius: radiusTokens.lg,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spaceTokens[2],
    marginBottom: spaceTokens[4],
    minHeight: 48,
    paddingHorizontal: spaceTokens[3],
  },
  searchGlyph: {
    color: colors.muted,
    fontSize: 20,
  },
  searchInput: {
    color: colors.deep,
    flex: 1,
    fontSize: fontTokens.sizes.body,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  srOnly: {
    height: 0,
    opacity: 0,
    position: "absolute",
    width: 0,
  },
  bannerWrap: {
    borderRadius: radiusTokens.lg,
    marginBottom: spaceTokens[4],
    overflow: "hidden",
  },
  banner: {
    aspectRatio: 1750 / 698,
    borderRadius: radiusTokens.lg,
  },
  bannerSecondary: {
    aspectRatio: 854 / 312,
    borderRadius: radiusTokens.lg,
  },
  sectionHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spaceTokens[3],
    marginTop: spaceTokens[1],
  },
  sectionTitle: {
    color: colors.deep,
    fontSize: 18,
    fontWeight: "800",
  },
  seeAll: {
    color: colors.primary,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
  },
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spaceTokens[4],
  },
  storeTile: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8EEF5",
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: 6,
  },
  storeLogo: {
    height: "100%",
    width: "100%",
  },
  storeFallback: {
    color: colors.deep,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  catRow: {
    gap: spaceTokens[3],
    paddingBottom: spaceTokens[2],
  },
  catItem: {
    alignItems: "center",
    width: 76,
  },
  catIcon: {
    borderRadius: radiusTokens.md,
    height: 72,
    marginBottom: spaceTokens[2],
    width: 72,
  },
  catFallback: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    justifyContent: "center",
  },
  catFallbackText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "800",
  },
  catLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 15,
    textAlign: "center",
  },
  error: {
    color: "#991B1B",
    fontSize: fontTokens.sizes.caption,
    marginBottom: spaceTokens[3],
  },
  footerLink: {
    alignItems: "center",
    minHeight: 44,
    paddingVertical: spaceTokens[3],
  },
  link: {
    color: colors.primary,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
  },
});
