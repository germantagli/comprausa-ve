import { colorTokens, fontTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME } from "@comprausa/types";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const colors = colorTokens.light;

const cart = require("../assets/brand/splash/cart.png");
const heroCollage = require("../assets/brand/splash/hero-collage.png");
const appMark = require("../assets/brand/splash/app-mark.png");
const iconShield = require("../assets/brand/splash/icon-shield.png");
const iconStore = require("../assets/brand/splash/icon-store.png");
const iconCard = require("../assets/brand/splash/icon-card.png");
const iconTruck = require("../assets/brand/splash/icon-truck.png");

const benefits = [
  { icon: iconShield, label: "Productos 100% originales" },
  { icon: iconStore, label: "Tus tiendas favoritas de USA" },
  { icon: iconCard, label: "Pagos seguros" },
  { icon: iconTruck, label: "Envíos a toda Venezuela" },
] as const;

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
      <View style={[styles.frame, styles.loading]} accessibilityState={{ busy: true }}>
        <Image source={appMark} accessibilityLabel={APP_BRAND_NAME} style={styles.loadingMark} resizeMode="contain" />
        <ActivityIndicator color={colors.primary} style={{ marginTop: spaceTokens[4] }} />
        <Text style={styles.caption}>Cargando…</Text>
      </View>
    );
  }

  return (
    <View style={styles.frame} accessibilityLabel={APP_BRAND_NAME}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <Image source={cart} style={styles.cart} resizeMode="contain" />
          <Text style={styles.wordmark}>
            <Text style={styles.wordmarkBlue}>Trae</Text>
            <Text style={styles.wordmarkOrange}>Lo</Text>
          </Text>
        </View>
        <Text style={styles.headline}>
          Compra en USA{"\n"}Recíbelo en Venezuela
        </Text>

        <Image source={heroCollage} style={styles.hero} resizeMode="contain" accessibilityElementsHidden />

        <View style={styles.benefits}>
          {benefits.map((item) => (
            <View key={item.label} style={styles.benefitRow}>
              <Image source={item.icon} style={styles.benefitIcon} resizeMode="contain" />
              <Text style={styles.benefitText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {serverReachable === false ? (
          <Text accessibilityLiveRegion="polite" style={styles.warn}>
            Sin conexión con el servidor. Puedes continuar; algunas acciones fallarán hasta recuperar la red.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onComenzar} style={styles.primary}>
          <Text style={styles.primaryText}>Comenzar</Text>
        </Pressable>
        <Text style={styles.accountPrompt}>
          ¿Ya tienes una cuenta?{" "}
          <Text accessibilityRole="link" onPress={onIniciarSesion} style={styles.accountLink}>
            Iniciar sesión
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  loading: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    justifyContent: "center",
    padding: spaceTokens[6],
  },
  loadingMark: {
    height: 120,
    width: 120,
  },
  scroll: {
    paddingBottom: spaceTokens[4],
    paddingHorizontal: spaceTokens[4],
    paddingTop: spaceTokens[6],
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spaceTokens[2],
    justifyContent: "center",
  },
  cart: {
    height: 44,
    width: 56,
  },
  wordmark: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  wordmarkBlue: {
    color: colors.primary,
  },
  wordmarkOrange: {
    color: colors.accent,
  },
  headline: {
    color: colors.deep,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
    marginTop: spaceTokens[3],
    textAlign: "center",
  },
  hero: {
    alignSelf: "center",
    height: 240,
    marginTop: spaceTokens[3],
    maxWidth: 420,
    width: "100%",
  },
  benefits: {
    gap: spaceTokens[3],
    marginTop: spaceTokens[4],
  },
  benefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spaceTokens[3],
  },
  benefitIcon: {
    height: 36,
    width: 36,
  },
  benefitText: {
    color: colors.deep,
    flex: 1,
    fontSize: fontTokens.sizes.body,
    fontWeight: "600",
    lineHeight: fontTokens.lineHeight.body,
  },
  warn: {
    color: colors.accent,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
    marginTop: spaceTokens[3],
    textAlign: "center",
  },
  caption: {
    color: colors.muted,
    fontSize: fontTokens.sizes.caption,
    marginTop: spaceTokens[3],
  },
  actions: {
    gap: spaceTokens[3],
    paddingBottom: spaceTokens[6],
    paddingHorizontal: spaceTokens[4],
    paddingTop: spaceTokens[3],
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 54,
  },
  primaryText: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
  },
  accountPrompt: {
    color: colors.muted,
    fontSize: fontTokens.sizes.body,
    textAlign: "center",
  },
  accountLink: {
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
