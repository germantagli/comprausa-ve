import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME } from "@comprausa/types";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

const colors = colorTokens.light;

export function SplashScreen({
  loading,
  serverReachable,
  onComenzar,
  onIniciarSesion,
}: {
  loading?: boolean;
  serverReachable: boolean | null;
  onComenzar: () => void;
  onIniciarSesion: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.frame} accessibilityState={{ busy: true }}>
        <Text style={styles.mark}>{APP_BRAND_NAME}</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spaceTokens[4] }} />
        <Text style={styles.caption}>Cargando…</Text>
      </View>
    );
  }

  return (
    <View style={styles.frame} accessibilityLabel={APP_BRAND_NAME}>
      <View style={styles.hero}>
        <Text style={styles.mark}>{APP_BRAND_NAME}</Text>
        <Text style={styles.tagline}>Compra en USA, recíbelo en Venezuela</Text>
        {serverReachable === false ? (
          <Text accessibilityLiveRegion="polite" style={styles.warn}>
            Sin conexión con el servidor. Puedes continuar; algunas acciones fallarán hasta recuperar la red.
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onComenzar} style={styles.primary}>
          <Text style={styles.primaryText}>Comenzar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onIniciarSesion} style={styles.secondary}>
          <Text style={styles.secondaryText}>Iniciar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spaceTokens[6],
    paddingVertical: spaceTokens[8],
  },
  hero: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  mark: {
    color: colors.primary,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  tagline: {
    color: colors.muted,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginTop: spaceTokens[6],
    maxWidth: 300,
    textAlign: "center",
  },
  caption: {
    color: colors.muted,
    fontSize: fontTokens.sizes.caption,
    marginTop: spaceTokens[3],
    textAlign: "center",
  },
  warn: {
    color: colors.warning,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
    marginTop: spaceTokens[4],
    maxWidth: 300,
    textAlign: "center",
  },
  actions: {
    gap: spaceTokens[3],
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryText: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
  },
  secondary: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryText: {
    color: colors.primary,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
  },
});
