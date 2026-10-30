import {
  ApiClientError,
  createProductRequest,
  type AuthenticatedSession,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiBase } from "./api";

const colors = colorTokens.light;

/**
 * Real product-request form. Persists via POST /v1/product-requests.
 * Does not scrape or fetch the pasted URL.
 */
export function MobileRequestScreen({
  session,
  onBack,
  onOpenRequest,
  onSignIn,
}: {
  session: AuthenticatedSession | null;
  onBack: () => void;
  onOpenRequest: (requestId: string) => void;
  onSignIn: () => void;
}) {
  const [productUrl, setProductUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    setFieldError(null);
    if (!session?.accessToken) {
      onSignIn();
      return;
    }
    const url = productUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setFieldError("Por favor ingresa una URL válida (http o https).");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError("La cantidad debe ser un entero mayor o igual a 1.");
      return;
    }
    setBusy(true);
    try {
      const created = await createProductRequest(apiBase, session.accessToken, {
        productUrl: url,
        quantity: qty,
        ...(productName.trim() ? { productName: productName.trim() } : {}),
        ...(size.trim() ? { size: size.trim() } : {}),
        ...(color.trim() ? { color: color.trim() } : {}),
        ...(additionalNotes.trim() ? { additionalNotes: additionalNotes.trim() } : {}),
      });
      onOpenRequest(created.id);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.status === 401
          ? "Inicia sesión para enviar la solicitud."
          : "No pudimos guardar la solicitud. Inténtalo de nuevo.",
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
        ¿No encuentras lo que buscas?
      </Text>
      <Text style={styles.body}>Pega el enlace del producto que deseas y te prepararemos una cotización.</Text>

      <Text style={styles.label}>Enlace del producto *</Text>
      <TextInput
        value={productUrl}
        onChangeText={(value) => {
          setFieldError(null);
          setProductUrl(value);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://…"
        placeholderTextColor={colors.muted}
        style={[styles.input, fieldError ? styles.inputInvalid : null]}
      />
      {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}

      <Text style={styles.label}>Nombre o descripción (opcional)</Text>
      <TextInput
        value={productName}
        onChangeText={setProductName}
        placeholder="Ej. Zapatillas Nike Air Max"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />

      <Text style={styles.label}>Cantidad *</Text>
      <View style={styles.qtyRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setQuantity(String(Math.max(1, (Number(quantity) || 1) - 1)))}
          style={styles.qtyBtn}
        >
          <Text style={styles.qtyBtnText}>−</Text>
        </Pressable>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          style={[styles.input, styles.qtyInput]}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setQuantity(String(Math.min(50, (Number(quantity) || 1) + 1)))}
          style={styles.qtyBtn}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Talla (opcional)</Text>
      <TextInput value={size} onChangeText={setSize} placeholder="Ej. 42 / M" placeholderTextColor={colors.muted} style={styles.input} />

      <Text style={styles.label}>Color (opcional)</Text>
      <TextInput value={color} onChangeText={setColor} placeholder="Ej. Negro" placeholderTextColor={colors.muted} style={styles.input} />

      <Text style={styles.label}>Comentarios adicionales (opcional)</Text>
      <TextInput
        value={additionalNotes}
        onChangeText={setAdditionalNotes}
        multiline
        placeholder="Detalles útiles para cotizar"
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.textarea]}
      />

      {error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={() => void submit()}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>{busy ? "Enviando…" : "Solicitar cotización"}</Text>
      </Pressable>
      <Text style={styles.caption}>No descargamos ni hacemos scraping del enlace. Solo lo guardamos como texto.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: spaceTokens[3], padding: spaceTokens[4], paddingBottom: spaceTokens[8] },
  linkHit: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  link: { color: colors.primary, fontWeight: "700" },
  title: {
    color: colors.deep,
    fontFamily: fontTokens.family,
    fontSize: 22,
    fontWeight: "800",
  },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: spaceTokens[2] },
  label: { color: colors.deep, fontSize: 14, fontWeight: "700", marginTop: spaceTokens[2] },
  input: {
    backgroundColor: "#fff",
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    color: colors.deep,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputInvalid: { backgroundColor: "#FEF2F2", borderColor: "#DC2626" },
  textarea: { minHeight: 88, textAlignVertical: "top" },
  qtyRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  qtyBtn: {
    alignItems: "center",
    backgroundColor: "#F1F4F8",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  qtyBtnText: { color: colors.deep, fontSize: 20, fontWeight: "700" },
  qtyInput: { flex: 1, textAlign: "center" },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    minHeight: 48,
    marginTop: spaceTokens[3],
  },
  primaryText: { color: colors.primaryOn, fontWeight: "700" },
  error: { color: "#B91C1C", marginTop: 4 },
  caption: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
