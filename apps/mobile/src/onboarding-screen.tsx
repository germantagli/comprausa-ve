import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { onboardingSteps } from "@comprausa/types";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const colors = colorTokens.light;

export function OnboardingScreen({ onDone, videoUrl }: { onDone: () => void; videoUrl?: string }) {
  const [step, setStep] = useState(0);
  const text = onboardingSteps[step] ?? onboardingSteps[0];
  const last = step >= onboardingSteps.length - 1;

  return (
    <View style={styles.page}>
      <Text style={styles.brand}>TraeLo</Text>
      <Text style={styles.body}>
        Paso {step + 1} de {onboardingSteps.length}
      </Text>
      <Text accessibilityRole="header" style={styles.title}>
        {text}
      </Text>
      <View style={styles.slot}>
        <Text style={styles.slotTitle}>De tiendas de USA a tu dirección en Venezuela.</Text>
        <Text style={styles.slotCaption}>Espacio para un video externo. No hay uno cargado.</Text>
        {videoUrl ? (
          <Text accessibilityRole="link" style={styles.link}>
            {videoUrl}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => (last ? onDone() : setStep((current) => current + 1))}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>Continuar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onDone} style={styles.secondary}>
        <Text style={styles.body}>Omitir</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    flex: 1,
    padding: spaceTokens[6],
  },
  brand: {
    color: colors.deep,
    fontSize: fontTokens.sizes.title,
    fontWeight: "800",
    lineHeight: fontTokens.lineHeight.title,
  },
  title: {
    color: colors.text,
    fontSize: fontTokens.sizes.title,
    fontWeight: "700",
    lineHeight: fontTokens.lineHeight.title,
    marginBottom: spaceTokens[4],
  },
  body: {
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[3],
  },
  caption: {
    color: colors.text,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
  },
  slotTitle: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[2],
  },
  slotCaption: {
    color: "rgba(255,255,255,0.85)",
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
  },
  link: {
    color: colors.primaryOn,
    marginTop: spaceTokens[2],
  },
  slot: {
    backgroundColor: colors.deep,
    borderRadius: radiusTokens.lg,
    marginBottom: spaceTokens[4],
    minHeight: 140,
    padding: spaceTokens[4],
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    marginBottom: spaceTokens[3],
    minHeight: 48,
  },
  primaryText: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    fontWeight: "600",
  },
  secondary: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
});
