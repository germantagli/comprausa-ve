import { probeServerReachable, type AuthenticatedSession } from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME } from "@comprausa/types";
import { useCallback, useEffect, useState } from "react";
import {
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
} from "react-native";
import { apiBase } from "./api";
import {
  formatDemoPrice,
  homeDemoBadges,
  homeDemoCategories,
  homeDemoFeaturedProducts,
  homeDemoHero,
  homeDemoOffers,
  homeDemoRequest,
} from "./home.mock";

const colors = colorTokens.light;
const H_PAD = 16;

const topInset = Platform.select({
  ios: 48,
  android: (StatusBar.currentHeight ?? 0) + 8,
  default: 12,
})!;

const headerLogo = require("../assets/brand/logo-header.png");

/**
 * TraeLo Home — DEMO visual presentation matching the approved mock.
 * Products/prices/ratings from home.mock.ts.
 */
export function HomeScreen({
  session: _session,
  serverReachable,
  onOpenCart: _onOpenCart,
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

  const refresh = useCallback(async () => {
    setReachable(await probeServerReachable(apiBase));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setReachable(serverReachable);
  }, [serverReachable]);

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
            <Pressable accessibilityRole="button" accessibilityLabel="Favoritos" onPress={onOpenProfile} style={styles.iconHit}>
              <Text style={styles.heart}>♡</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Notificaciones" onPress={onOpenOrders} style={styles.iconHit}>
              <Text style={styles.bell}>🔔</Text>
              {homeDemoBadges.notifications > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{homeDemoBadges.notifications}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        {reachable === false ? (
          <Pressable onPress={() => void refresh()} style={styles.offline}>
            <Text style={styles.offlineText}>Sin conexión. La Home DEMO sigue visible. Toca para reintentar.</Text>
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
            onSubmitEditing={() => onOpenExplore(draft.trim() || undefined)}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {homeDemoHero.titleBefore}
              <Text style={styles.heroAccent}>{homeDemoHero.titleAccent}</Text>
            </Text>
            <Text style={styles.heroSub}>{homeDemoHero.subtitle}</Text>
            <Pressable accessibilityRole="button" onPress={() => onOpenExplore()} style={styles.heroCta}>
              <Text style={styles.heroCtaText}>{homeDemoHero.cta} →</Text>
            </Pressable>
          </View>
          <Image source={homeDemoHero.art} style={styles.heroArt} resizeMode="contain" accessibilityLabel="" />
        </View>

        <SectionHeader title="Categorías" onSeeAll={() => onOpenExplore()} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {homeDemoCategories.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={category.name}
              onPress={() => onOpenExplore(category.name)}
              style={styles.catItem}
            >
              <Image source={category.image} style={styles.catIcon} resizeMode="cover" />
              <Text style={styles.catLabel}>{category.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="Productos destacados" seeAll="Ver todos" onSeeAll={() => onOpenExplore()} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
          {homeDemoFeaturedProducts.map((product) => (
            <Pressable
              key={product.id}
              accessibilityRole="button"
              onPress={() => onOpenProduct(product.id)}
              style={styles.productCard}
            >
              <View style={styles.productPhoto}>
                {product.discountPercent ? (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{product.discountPercent}%</Text>
                  </View>
                ) : null}
                <Text style={styles.fav}>♡</Text>
                <Image source={product.image} style={styles.productImage} resizeMode="contain" />
              </View>
              <Text numberOfLines={2} style={styles.productName}>
                {product.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>{formatDemoPrice(product.price)}</Text>
                {product.compareAtPrice ? <Text style={styles.comparePrice}>{formatDemoPrice(product.compareAtPrice)}</Text> : null}
              </View>
              <Text style={styles.rating}>
                {"★".repeat(product.rating)} <Text style={styles.reviewCount}>({product.reviewCount})</Text>
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.requestBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.requestTitle}>{homeDemoRequest.title}</Text>
            <Text style={styles.requestBody}>{homeDemoRequest.subtitle}</Text>
            <Pressable accessibilityRole="button" onPress={onOpenRequest} style={styles.requestCta}>
              <Text style={styles.requestCtaText}>{homeDemoRequest.cta} →</Text>
            </Pressable>
          </View>
          <Image source={homeDemoRequest.art} style={styles.requestArt} resizeMode="contain" />
        </View>

        <SectionHeader title="Ofertas especiales" onSeeAll={() => onOpenExplore()} />
        <View style={styles.offerGrid}>
          {homeDemoOffers.map((offer) => (
            <Pressable
              key={offer.id}
              onPress={() => onOpenExplore(offer.exploreQuery)}
              style={[styles.offerCard, { backgroundColor: offer.background }]}
            >
              <View style={[styles.offerPercent, { backgroundColor: offer.badgeColor }]}>
                <Text style={styles.offerPercentText}>%</Text>
              </View>
              <Text style={[styles.offerTitle, { color: offer.titleColor }]}>{offer.title}</Text>
              {offer.subtitle ? <Text style={[styles.offerBody, { color: offer.titleColor }]}>{offer.subtitle}</Text> : null}
              <View style={[styles.offerBtn, { backgroundColor: offer.buttonBackground }]}>
                <Text style={[styles.offerBtnText, { color: offer.buttonColor }]}>Ver ofertas →</Text>
              </View>
              <Image source={offer.art} style={styles.offerArt} resizeMode="contain" />
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </View>
  );
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
  scroll: { gap: 14, paddingBottom: 24, paddingHorizontal: H_PAD },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 36 },
  logo: { height: 28, width: 118 },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 2 },
  iconHit: { alignItems: "center", height: 36, justifyContent: "center", position: "relative", width: 36 },
  heart: { color: colors.primary, fontSize: 22, lineHeight: 26 },
  bell: { fontSize: 18, lineHeight: 24 },
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
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
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
    minHeight: 44,
    paddingHorizontal: 14,
  },
  searchGlyph: { color: "#8A97A8", fontSize: 18 },
  searchInput: { color: colors.deep, flex: 1, fontSize: 14, paddingVertical: Platform.OS === "ios" ? 11 : 8 },
  hero: {
    alignItems: "center",
    backgroundColor: "#2F7BE8",
    borderRadius: 18,
    flexDirection: "row",
    gap: 4,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  heroCopy: { flex: 1 },
  heroTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", letterSpacing: -0.3, lineHeight: 22, marginBottom: 6 },
  heroAccent: { color: colors.accent },
  heroSub: { color: "rgba(255,255,255,0.92)", fontSize: 12, lineHeight: 17, marginBottom: 10 },
  heroCta: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  heroCtaText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  heroArt: { height: 108, width: 118 },
  sectionHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: -4 },
  sectionTitle: { color: colors.deep, fontSize: 17, fontWeight: "800" },
  seeAll: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  catRow: { gap: 12, paddingVertical: 4 },
  catItem: { alignItems: "center", width: 72 },
  catIcon: { borderRadius: 14, height: 68, marginBottom: 6, width: 68 },
  catLabel: { color: colors.deep, fontSize: 11, fontWeight: "600", textAlign: "center" },
  productRow: { gap: 10, paddingVertical: 4 },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8EEF5",
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    width: 148,
  },
  productPhoto: {
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
    position: "relative",
  },
  productImage: { height: "100%", width: "100%" },
  discountBadge: {
    backgroundColor: "#E11D48",
    borderRadius: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: 6,
    zIndex: 1,
  },
  discountText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  fav: { color: colors.primary, fontSize: 16, position: "absolute", right: 8, top: 6, zIndex: 1 },
  productName: { color: colors.deep, fontSize: 13, fontWeight: "700", marginBottom: 4 },
  priceRow: { alignItems: "baseline", flexDirection: "row", gap: 6, marginBottom: 2 },
  productPrice: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  comparePrice: { color: colors.muted, fontSize: 12, textDecorationLine: "line-through" },
  rating: { color: "#F5A524", fontSize: 12 },
  reviewCount: { color: colors.muted },
  requestBanner: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
    padding: 14,
  },
  requestTitle: { color: colors.deep, fontSize: 16, fontWeight: "800", marginBottom: 4 },
  requestBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  requestCta: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  requestCtaText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  requestArt: { height: 86, width: 110 },
  offerGrid: { flexDirection: "row", gap: 10 },
  offerCard: { borderRadius: 14, flex: 1, minHeight: 132, overflow: "hidden", padding: 12 },
  offerPercent: {
    alignItems: "center",
    borderRadius: 8,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 22,
    zIndex: 2,
  },
  offerPercentText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  offerTitle: { fontSize: 13, fontWeight: "800", marginBottom: 4, marginRight: 28 },
  offerBody: { fontSize: 10, lineHeight: 14, marginBottom: 8, marginRight: 20, opacity: 0.85 },
  offerBtn: {
    alignSelf: "flex-start",
    borderRadius: 999,
    minHeight: 26,
    justifyContent: "center",
    paddingHorizontal: 10,
    zIndex: 1,
  },
  offerBtnText: { fontSize: 11, fontWeight: "700" },
  offerArt: { bottom: 4, height: 56, position: "absolute", right: 2, width: 78 },
});
