import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { filterCountries, type CountryDialCode } from "@comprausa/utils";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const colors = colorTokens.light;

export function CountryDialPicker({
  value,
  onChange,
}: {
  value: CountryDialCode;
  onChange: (next: CountryDialCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const countries = useMemo(() => filterCountries(query), [query]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Código de país ${value.name} ${value.dial}`}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <Text style={styles.flag}>{value.flag}</Text>
        <Text style={styles.dial}>{value.dial}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>País / código</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={() => {
                  setOpen(false);
                  setQuery("");
                }}
                style={styles.close}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Buscar país o código"
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Buscar país o código"
              placeholderTextColor={colors.muted}
              style={styles.search}
              value={query}
            />
            <FlatList
              data={countries}
              keyExtractor={(item) => `${item.iso2}-${item.dial}`}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
              renderItem={({ item }) => {
                const selected = item.iso2 === value.iso2 && item.dial === value.dial;
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                      setQuery("");
                    }}
                    style={[styles.row, selected ? styles.rowSelected : null]}
                  >
                    <Text style={styles.rowFlag}>{item.flag}</Text>
                    <View style={styles.rowText}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowIso}>{item.iso2}</Text>
                    </View>
                    <Text style={styles.rowDial}>{item.dial}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spaceTokens[2],
    minHeight: 52,
    paddingHorizontal: spaceTokens[3],
  },
  flag: {
    fontSize: 18,
  },
  dial: {
    color: colors.deep,
    fontWeight: "700",
  },
  chevron: {
    color: colors.muted,
    fontSize: 12,
  },
  overlay: {
    backgroundColor: "rgba(20, 36, 59, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radiusTokens.lg,
    borderTopRightRadius: radiusTokens.lg,
    maxHeight: "82%",
    paddingHorizontal: spaceTokens[4],
    paddingTop: spaceTokens[4],
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spaceTokens[3],
  },
  title: {
    color: colors.deep,
    fontSize: fontTokens.sizes.title,
    fontWeight: "800",
  },
  close: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  closeText: {
    color: colors.muted,
    fontSize: 20,
  },
  search: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    color: colors.text,
    marginBottom: spaceTokens[3],
    minHeight: 48,
    paddingHorizontal: spaceTokens[3],
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spaceTokens[3],
    minHeight: 56,
    paddingVertical: spaceTokens[2],
  },
  rowSelected: {
    backgroundColor: "#EAF3FF",
  },
  rowFlag: {
    fontSize: 22,
    width: 28,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    color: colors.deep,
    fontWeight: "600",
  },
  rowIso: {
    color: colors.muted,
    fontSize: fontTokens.sizes.caption,
  },
  rowDial: {
    color: colors.deep,
    fontWeight: "700",
  },
  empty: {
    color: colors.muted,
    padding: spaceTokens[4],
    textAlign: "center",
  },
});
