import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME, onboardingSteps, type OnboardingBulletIcon } from "@comprausa/types";
import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from "react-native";

const colors = colorTokens.light;

const topInset = Platform.select({
  ios: 52,
  android: (StatusBar.currentHeight ?? 0) + spaceTokens[3],
  default: spaceTokens[4],
})!;

const bottomInset = Platform.select({
  ios: 28,
  android: spaceTokens[6],
  default: spaceTokens[6],
})!;

const heroes: Record<(typeof onboardingSteps)[number]["id"], ImageSourcePropType> = {
  "1": require("../assets/brand/onboarding/step-1.png"),
  "2": require("../assets/brand/onboarding/step-2.png"),
  "3": require("../assets/brand/onboarding/step-3.png"),
  "4": require("../assets/brand/onboarding/step-4.png"),
};

const icons: Record<OnboardingBulletIcon, ImageSourcePropType> = {
  search: require("../assets/brand/onboarding/icons/search.png"),
  card: require("../assets/brand/onboarding/icons/card.png"),
  package: require("../assets/brand/onboarding/icons/package.png"),
  store: require("../assets/brand/onboarding/icons/store.png"),
  apparel: require("../assets/brand/onboarding/icons/apparel.png"),
  grid: require("../assets/brand/onboarding/icons/grid.png"),
  paypal: require("../assets/brand/onboarding/icons/paypal.png"),
  zelle: require("../assets/brand/onboarding/icons/zelle.png"),
  "pago-movil": require("../assets/brand/onboarding/icons/pago-movil.png"),
  truck: require("../assets/brand/onboarding/icons/truck.png"),
  pin: require("../assets/brand/onboarding/icons/pin.png"),
  shield: require("../assets/brand/onboarding/icons/shield.png"),
  check: require("../assets/brand/onboarding/icons/check.png"),
};

const cartMark = require("../assets/brand/splash/cart.png");

/** Post-registration bienvenida — Expo Android + iOS, parity with web mock. */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = onboardingSteps[step] ?? onboardingSteps[0];
  const last = step >= onboardingSteps.length - 1;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const heroHeight = Math.max(240, Math.min(Math.round(windowHeight * 0.42), 380));

  return (
    <View style={styles.page} accessibilityLabel={`Bienvenida ${APP_BRAND_NAME}`}>
      <StatusBar barStyle="dark-content" />
      <View pointerEvents="none" style={styles.skyWash} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={cartMark} accessibilityLabel="" style={styles.cart} resizeMode="contain" />
            <Text style={styles.wordmark}>
              <Text style={styles.trae}>Trae</Text>
              <Text style={styles.lo}>Lo</Text>
            </Text>
          </View>
          <Text accessibilityLabel={`Paso ${step + 1} de ${onboardingSteps.length}`} style={styles.counter}>
            {step + 1}/{onboardingSteps.length}
          </Text>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          {current.title}
        </Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>

        <Image
          key={current.id}
          source={heroes[current.id]}
          accessibilityLabel=""
          style={[styles.hero, { width: windowWidth, height: heroHeight }]}
          resizeMode="cover"
        />

        <View style={styles.bullets}>
          {current.bullets.map((bullet) => (
            <View key={bullet.text} style={styles.bulletRow}>
              <Image source={icons[bullet.icon]} accessibilityLabel="" style={styles.bulletIcon} />
              <Text style={styles.bulletText}>{bullet.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset }]}>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {onboardingSteps.map((item, index) => (
            <View
              key={item.id}
              style={[styles.dot, index === step ? styles.dotActive : null, index === step ? styles.dotPill : null]}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={current.primaryLabel}
          onPress={() => (last ? onDone() : setStep((currentStep) => currentStep + 1))}
          style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
        >
          <Text style={styles.primaryText}>{current.primaryLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Omitir"
          onPress={onDone}
          style={({ pressed }) => [styles.secondary, pressed ? styles.pressed : null]}
        >
          <Text style={styles.secondaryText}>Omitir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  skyWash: {
    backgroundColor: "#D6E8FF",
    height: "36%",
    left: 0,
    opacity: 0.85,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scroll: {
    paddingBottom: spaceTokens[4],
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spaceTokens[3],
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
    position: "relative",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spaceTokens[2],
  },
  cart: {
    height: 38,
    width: 48,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  trae: {
    color: colors.primary,
  },
  lo: {
    color: colors.accent,
  },
  counter: {
    color: colors.muted,
    fontSize: fontTokens.sizes.caption,
    fontWeight: "600",
    position: "absolute",
    right: spaceTokens[4],
    top: 12,
  },
  title: {
    color: colors.deep,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: spaceTokens[2],
    paddingHorizontal: spaceTokens[4],
    textAlign: "center",
  },
  subtitle: {
    color: colors.primary,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[3],
    paddingHorizontal: spaceTokens[4],
    textAlign: "center",
  },
  hero: {
    alignSelf: "center",
    marginBottom: spaceTokens[4],
  },
  bullets: {
    gap: spaceTokens[3],
    paddingHorizontal: spaceTokens[4],
  },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spaceTokens[3],
  },
  bulletIcon: {
    height: 28,
    marginTop: 2,
    width: 28,
  },
  bulletText: {
    color: colors.deep,
    flex: 1,
    fontSize: fontTokens.sizes.body,
    fontWeight: "600",
    lineHeight: fontTokens.lineHeight.body,
  },
  footer: {
    backgroundColor: "#FFFFFF",
    gap: spaceTokens[3],
    paddingHorizontal: spaceTokens[4],
    paddingTop: spaceTokens[2],
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: spaceTokens[1],
  },
  dot: {
    backgroundColor: "#D7E0EC",
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotPill: {
    width: 22,
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.lg,
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
    borderRadius: radiusTokens.lg,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryText: {
    color: colors.primary,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
  },
});
