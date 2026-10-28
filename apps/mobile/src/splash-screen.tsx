import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME } from "@comprausa/types";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

const colors = colorTokens.light;
const logo = require("../assets/brand/logo.png");

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
        <Image source={logo} accessibilityLabel={APP_BRAND_NAME} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator color={colors.accent} style={{ marginTop: spaceTokens[4] }} />
        <Text style={styles.caption}>Cargando…</Text>
      </View>
    );
  }

  return (
    <View style={styles.frame} accessibilityLabel={APP_BRAND_NAME}>
      <View style={styles.hero}>
        <Image source={logo} accessibilityLabel={APP_BRAND_NAME} style={styles.logo} resizeMode="contain" />
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
    backgroundColor: "#000000",
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
  logo: {
    height: 260,
    maxWidth: "100%",
    width: 260,
  },
  tagline: {
    color: "rgba(255,255,255,0.78)",
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginTop: spaceTokens[4],
    maxWidth: 300,
    textAlign: "center",
  },
  caption: {
    color: "rgba(255,255,255,0.7)",
    fontSize: fontTokens.sizes.caption,
    marginTop: spaceTokens[3],
    textAlign: "center",
  },
  warn: {
    color: colors.accent,
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
    backgroundColor: "transparent",
    borderColor: colors.accent,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryText: {
    color: colors.accent,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
  },
});
