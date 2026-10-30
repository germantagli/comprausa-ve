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
const SKY = "#DCEBFF";
const H_PAD = 16;

const topInset = Platform.select({
  ios: 48,
  android: (StatusBar.currentHeight ?? 0) + 8,
  default: 12,
})!;

const bottomInset = Platform.select({
  ios: 24,
  android: spaceTokens[4],
  default: spaceTokens[4],
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

/** Soft multi-stop fade without expo-linear-gradient. */
function SoftFade({
  from,
  height,
  edge,
}: {
  from: "top" | "bottom";
  height: number;
  edge: "sky" | "white";
}) {
  const base = edge === "sky" ? SKY : "#FFFFFF";
  const stops = [0.85, 0.62, 0.4, 0.22, 0.1, 0];
  const ordered = from === "top" ? stops : [...stops].reverse();
  const strip = height / ordered.length;
  return (
    <View pointerEvents="none" style={[styles.fadeHost, from === "top" ? { top: 0, height } : { bottom: 0, height }]}>
      {ordered.map((opacity, index) => (
        <View
          key={`${from}-${index}`}
          style={{ backgroundColor: base, height: strip, opacity }}
        />
      ))}
    </View>
  );
}

function HeroWithSfumatura({
  source,
  width,
  height,
}: {
  source: ImageSourcePropType;
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.heroWrap, { width, height }]}>
      <Image source={source} accessibilityLabel="" style={{ width, height }} resizeMode="contain" />
      <SoftFade from="top" height={56} edge="sky" />
      <SoftFade from="bottom" height={72} edge="white" />
    </View>
  );
}

/** Post-registration bienvenida — Expo Android + iOS with soft hero blends. */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = onboardingSteps[step] ?? onboardingSteps[0];
  const last = step >= onboardingSteps.length - 1;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const heroHeight = Math.max(200, Math.min(Math.round(windowHeight * 0.34), 300));

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

        <HeroWithSfumatura key={current.id} source={heroes[current.id]} width={windowWidth} height={heroHeight} />

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
            <View key={item.id} style={[styles.dot, index === step ? styles.dotActive : null]} />
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
    backgroundColor: SKY,
    height: "42%",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scroll: {
    paddingBottom: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    minHeight: 40,
    paddingHorizontal: H_PAD,
    position: "relative",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  cart: {
    height: 34,
    width: 44,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
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
    right: H_PAD,
    top: 10,
  },
  title: {
    color: colors.deep,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 6,
    paddingHorizontal: H_PAD,
    textAlign: "center",
  },
  subtitle: {
    color: colors.primary,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: H_PAD,
    textAlign: "center",
  },
  heroWrap: {
    alignSelf: "center",
    marginBottom: 4,
    overflow: "hidden",
  },
  fadeHost: {
    left: 0,
    position: "absolute",
    right: 0,
  },
  bullets: {
    gap: 12,
    paddingHorizontal: H_PAD,
    paddingTop: 4,
  },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  bulletIcon: {
    height: 24,
    marginTop: 1,
    width: 24,
  },
  bulletText: {
    color: colors.deep,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  footer: {
    backgroundColor: "#FFFFFF",
    gap: 12,
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    paddingVertical: 4,
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
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.lg,
    justifyContent: "center",
    minHeight: 50,
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
