import {
  ApiClientError,
  createQuote,
  type AuthenticatedSession,
  type VenezuelaAddressInput,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiBase } from "./api";

const colors = colorTokens.light;

/**
 * Product request — paste a USA URL for TraeLo to quote.
 * Uses existing POST /v1/quotes with pastedUrl (no scraping).
 */
export function MobileRequestScreen({
  session,
  onBack,
  onOpenQuote,
  onSignIn,
}: {
  session: AuthenticatedSession | null;
  onBack: () => void;
  onOpenQuote: (quoteId: string) => void;
  onSignIn: () => void;
}) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    setSuccess(null);
    if (!session?.accessToken) {
      setError("Inicia sesión para enviar una solicitud de cotización.");
      return;
    }
    const trimmed = url.trim();
    if (!trimmed.startsWith("http")) {
      setError("Pega un enlace https del producto.");
      return;
    }
    const address: VenezuelaAddressInput = {
      state: state.trim() || "Distrito Capital",
      city: city.trim() || "Caracas",
      municipality: municipality.trim() || "Libertador",
      reference: reference.trim() || "Solicitud desde Home",
    };
    setBusy(true);
    try {
      const quote = await createQuote(apiBase, session.accessToken, { address, pastedUrl: trimmed });
      setSuccess("Solicitud enviada. Abriendo cotización…");
      onOpenQuote(quote.id);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.status === 400
          ? "Revisa el enlace y la dirección."
          : "No pudimos enviar la solicitud. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>← Volver al inicio</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Solicitar producto
      </Text>
      <Text style={styles.body}>Envíanos el enlace y te preparamos una cotización. No hacemos scraping automático.</Text>

      {!session ? (
        <View>
          <Text style={styles.error}>Inicia sesión para enviar una solicitud.</Text>
          <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.primary}>
            <Text style={styles.primaryText}>Entrar</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <Field label="Enlace del producto" value={url} onChange={setUrl} placeholder="https://…" />
          <Field label="Estado" value={state} onChange={setState} placeholder="Distrito Capital" />
          <Field label="Ciudad" value={city} onChange={setCity} placeholder="Caracas" />
          <Field label="Municipio" value={municipality} onChange={setMunicipality} placeholder="Libertador" />
          <Field label="Referencia / notas" value={reference} onChange={setReference} placeholder="Opcional" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={styles.primary}>
            <Text style={styles.primaryText}>{busy ? "Enviando…" : "Enviar solicitud"}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, padding: spaceTokens[4], paddingBottom: spaceTokens[8] },
  title: {
    color: colors.deep,
    fontSize: fontTokens.sizes.title,
    fontWeight: "800",
    lineHeight: fontTokens.lineHeight.title,
    marginBottom: spaceTokens[2],
  },
  body: { color: colors.muted, fontSize: fontTokens.sizes.body, lineHeight: fontTokens.lineHeight.body, marginBottom: spaceTokens[4] },
  field: { marginBottom: spaceTokens[3] },
  label: { color: colors.deep, fontSize: fontTokens.sizes.body, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    color: colors.deep,
    minHeight: 48,
    paddingHorizontal: spaceTokens[3],
  },
  primary: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    marginTop: spaceTokens[2],
    minHeight: 48,
    paddingHorizontal: spaceTokens[4],
  },
  primaryText: { color: colors.primaryOn, fontSize: fontTokens.sizes.body, fontWeight: "700" },
  link: { color: colors.primary, fontSize: fontTokens.sizes.body, fontWeight: "700" },
  linkHit: { marginBottom: spaceTokens[3], minHeight: 44, justifyContent: "center" },
  error: { color: colors.error, fontSize: fontTokens.sizes.body, marginBottom: spaceTokens[3] },
  success: { color: colors.success, fontSize: fontTokens.sizes.body, marginBottom: spaceTokens[3] },
});
