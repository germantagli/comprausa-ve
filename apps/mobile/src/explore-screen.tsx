/**
 * TraeLo Explorar — DEMO catalog (mobile). Matches web search / chips / grid / filters / cart.
 */
import { colorTokens, radiusTokens } from "@comprausa/design-tokens";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useDemoCommerce } from "./demo-commerce";
import {
  DEMO_CATEGORIES,
  DEMO_PRICE_BOUNDS,
  defaultDemoFilters,
  demoProducts,
  filterDemoProducts,
  formatDemoPrice,
  type DemoCategoryChip,
  type DemoFilterState,
  type DemoProduct,
  type DemoProductCategory,
  type DemoSortOption,
} from "./products.mock";

const colors = colorTokens.light;

const FILTER_CATEGORIES: DemoProductCategory[] = [
  "Tecnología",
  "Moda",
  "Calzado",
  "Hogar",
  "Belleza",
  "Deportes",
];

const SORT_OPTIONS: { id: DemoSortOption; label: string }[] = [
  { id: "relevancia", label: "Relevancia" },
  { id: "precio-asc", label: "Precio: menor a mayor" },
  { id: "precio-desc", label: "Precio: mayor a menor" },
  { id: "rating", label: "Mejor valorados" },
];

export function ExploreScreen({
  onOpenProduct,
  initialQuery = "",
}: {
  onOpenProduct: (productId: string) => void;
  initialQuery?: string;
}) {
  const {
    addToCart,
    toggleFavorite,
    isFavorite,
    exploreFilters,
    setExploreFilters,
    resetExploreFilters,
    toast,
    clearToast,
    filtersOpen,
    setFiltersOpen,
  } = useDemoCommerce();

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<DemoCategoryChip>("Todos");
  const [filterDraft, setFilterDraft] = useState<DemoFilterState>(exploreFilters);

  useEffect(() => {
    setQuery(initialQuery);
    if (initialQuery.trim()) {
      const match = DEMO_CATEGORIES.find(
        (chip) => chip !== "Todos" && chip.toLowerCase() === initialQuery.trim().toLowerCase(),
      );
      if (match) {
        setCategory(match);
      }
    }
  }, [initialQuery]);

  const products = useMemo(
    () =>
      filterDemoProducts(demoProducts, {
        query,
        categoryChip: category,
        filters: exploreFilters,
      }),
    [query, category, exploreFilters],
  );

  function clearAll(): void {
    setQuery("");
    setCategory("Todos");
    resetExploreFilters();
  }

  function onAdd(product: DemoProduct): void {
    if (product.requiresVariant) {
      onOpenProduct(product.id);
      return;
    }
    addToCart(product);
  }

  return (
    <View style={styles.frame}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Explorar
          </Text>
          <Text style={styles.bell}>🔔</Text>
        </View>

        <View style={styles.searchShell}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            accessibilityLabel="Buscar productos"
            placeholder="Buscar productos..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => setQuery("")} style={styles.clearHit}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros"
            onPress={() => {
              setFilterDraft(exploreFilters);
              setFiltersOpen(true);
            }}
            style={styles.filterHit}
          >
            <Text style={styles.filterGlyph}>☰</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DEMO_CATEGORIES.map((chip) => {
            const selected = category === chip;
            return (
              <Pressable
                key={chip}
                accessibilityRole="button"
                onPress={() => setCategory(chip)}
                style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
              >
                <Text style={[styles.chipText, selected ? styles.chipTextOn : null]}>{chip}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {products.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No encontramos productos con esa búsqueda.</Text>
            <Pressable accessibilityRole="button" onPress={clearAll} style={styles.primary}>
              <Text style={styles.primaryText}>Limpiar filtros</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {products.map((product) => {
              const fav = isFavorite(product.id);
              return (
                <View key={product.id} style={styles.card}>
                  <View style={styles.photo}>
                    {product.discountPercent ? (
                      <View style={styles.discount}>
                        <Text style={styles.discountText}>-{product.discountPercent}%</Text>
                      </View>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
                      onPress={() => toggleFavorite(product.id)}
                      style={styles.favHit}
                    >
                      <Text style={[styles.fav, fav ? styles.favOn : null]}>{fav ? "♥" : "♡"}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => onOpenProduct(product.id)} style={styles.imageHit}>
                      <Image source={product.image} style={styles.image} resizeMode="contain" />
                    </Pressable>
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => onOpenProduct(product.id)}>
                    <Text numberOfLines={2} style={styles.name}>
                      {product.name}
                    </Text>
                  </Pressable>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatDemoPrice(product.price)}</Text>
                    {product.compareAtPrice ? (
                      <Text style={styles.compare}>{formatDemoPrice(product.compareAtPrice)}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.rating}>
                    {"★".repeat(Math.max(1, Math.round(product.rating)))}{" "}
                    <Text style={styles.reviews}>({product.reviewCount})</Text>
                  </Text>
                  <Pressable accessibilityRole="button" onPress={() => onAdd(product)} style={styles.addBtn}>
                    <Text style={styles.addText}>⊞ Agregar</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {toast ? (
        <Pressable accessibilityRole="button" onPress={clearToast} style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </Pressable>
      ) : null}

      <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalFrame}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setFiltersOpen(false)}>
              <Text style={styles.link}>←</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Filtros</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <View style={styles.chipWrap}>
              {FILTER_CATEGORIES.map((name) => {
                const selected = filterDraft.categories.includes(name);
                return (
                  <Pressable
                    key={name}
                    onPress={() =>
                      setFilterDraft((current) => ({
                        ...current,
                        categories: selected
                          ? current.categories.filter((c) => c !== name)
                          : [...current.categories, name],
                      }))
                    }
                    style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
                  >
                    <Text style={[styles.chipText, selected ? styles.chipTextOn : null]}>{name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Precio</Text>
            <View style={styles.priceFields}>
              <TextInput
                accessibilityLabel="Precio mínimo"
                keyboardType="numeric"
                value={String(filterDraft.minPrice)}
                onChangeText={(text) =>
                  setFilterDraft((current) => ({ ...current, minPrice: Number(text) || 0 }))
                }
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Precio máximo"
                keyboardType="numeric"
                value={String(filterDraft.maxPrice)}
                onChangeText={(text) =>
                  setFilterDraft((current) => ({ ...current, maxPrice: Number(text) || 0 }))
                }
                style={styles.input}
              />
            </View>

            <Text style={styles.sectionTitle}>Ordenar por</Text>
            {SORT_OPTIONS.map((option) => {
              const selected = filterDraft.sort === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setFilterDraft((current) => ({ ...current, sort: option.id }))}
                  style={[styles.sortBtn, selected ? styles.sortOn : null]}
                >
                  <Text style={[styles.sortText, selected ? styles.sortTextOn : null]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable
              onPress={() => {
                setFilterDraft(defaultDemoFilters);
                resetExploreFilters();
              }}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Restablecer</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setExploreFilters({
                  ...filterDraft,
                  minPrice: Math.max(DEMO_PRICE_BOUNDS.min, filterDraft.minPrice),
                  maxPrice: Math.min(DEMO_PRICE_BOUNDS.max, filterDraft.maxPrice),
                });
                setFiltersOpen(false);
              }}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Aplicar filtros</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.background, flex: 1 },
  page: { gap: 14, padding: 16, paddingBottom: 28 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { color: colors.deep, fontSize: 22, fontWeight: "800" },
  bell: { fontSize: 18 },
  searchShell: {
    alignItems: "center",
    backgroundColor: "#F1F4F8",
    borderColor: "#E4EAF1",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  searchIcon: { color: colors.muted, fontSize: 16 },
  searchInput: { color: colors.deep, flex: 1, fontSize: 14, minHeight: 42, paddingVertical: 8 },
  clearHit: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  clearText: { color: colors.muted, fontSize: 22, lineHeight: 24 },
  filterHit: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#E4EAF1",
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  filterGlyph: { color: colors.deep, fontSize: 14, fontWeight: "700" },
  chipRow: { gap: 8, paddingBottom: 2 },
  chip: { borderRadius: 999, borderWidth: 1, minHeight: 34, paddingHorizontal: 14, justifyContent: "center" },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipOff: { backgroundColor: "#fff", borderColor: "#D7E0EC" },
  chipText: { color: colors.deep, fontSize: 13, fontWeight: "700" },
  chipTextOn: { color: "#fff" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  empty: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#E8EEF5",
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    gap: 12,
    padding: 28,
  },
  emptyText: { color: colors.deep, fontSize: 15, fontWeight: "600", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  card: {
    backgroundColor: "#fff",
    borderColor: "#E8EEF5",
    borderRadius: 15,
    borderWidth: 1,
    padding: 11,
    width: "48%",
  },
  photo: {
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
    position: "relative",
  },
  discount: {
    backgroundColor: "#E11D48",
    borderRadius: 999,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    position: "absolute",
    top: 8,
    zIndex: 2,
  },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  favHit: { position: "absolute", right: 6, top: 6, zIndex: 2 },
  fav: { color: colors.primary, fontSize: 18 },
  favOn: { color: "#E11D48" },
  imageHit: { ...StyleSheet.absoluteFill, padding: 10 },
  image: { height: "100%", width: "100%" },
  name: { color: colors.deep, fontSize: 13, fontWeight: "700", minHeight: 32 },
  priceRow: { alignItems: "baseline", flexDirection: "row", gap: 6, marginTop: 4 },
  price: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  compare: { color: "#94A3B8", fontSize: 12, textDecorationLine: "line-through" },
  rating: { color: "#F5A524", fontSize: 12, marginBottom: 10, marginTop: 4 },
  reviews: { color: "#94A3B8" },
  addBtn: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: "center",
    marginTop: "auto",
    minHeight: 38,
  },
  addText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondary: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  secondaryText: { color: colors.deep, fontWeight: "700" },
  toast: {
    alignSelf: "center",
    backgroundColor: colors.deep,
    borderRadius: 12,
    bottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    position: "absolute",
  },
  toastText: { color: "#fff", fontWeight: "600" },
  modalFrame: { backgroundColor: colors.background, flex: 1, paddingTop: 48 },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  modalTitle: { color: colors.deep, fontSize: 20, fontWeight: "800" },
  modalBody: { gap: 12, padding: 16 },
  sectionTitle: { color: colors.deep, fontSize: 15, fontWeight: "800", marginTop: 8 },
  priceFields: { flexDirection: "row", gap: 10 },
  input: {
    backgroundColor: "#F7FAFD",
    borderColor: "#E4EAF1",
    borderRadius: 10,
    borderWidth: 1,
    color: colors.deep,
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  sortBtn: {
    backgroundColor: "#fff",
    borderColor: "#E4EAF1",
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  sortOn: { backgroundColor: "#EAF3FF", borderColor: colors.primary },
  sortText: { color: colors.deep, fontWeight: "600" },
  sortTextOn: { color: colors.primary },
  modalActions: { flexDirection: "row", gap: 10, padding: 16 },
  link: { color: colors.deep, fontSize: 22, fontWeight: "700" },
});
