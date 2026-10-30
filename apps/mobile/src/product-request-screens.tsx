import {
  ApiClientError,
  acceptProductQuote,
  getMyProductRequest,
  listMyProductRequests,
  rejectProductQuote,
  type AuthenticatedSession,
  type ProductRequestView,
} from "@comprausa/api-client";
import { formatUsdFromMinor } from "@comprausa/utils";
import { colorTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiBase } from "./api";

const colors = colorTokens.light;

const statusLabel: Record<ProductRequestView["status"], string> = {
  RECEIVED: "Recibida",
  IN_REVIEW: "En revisión",
  QUOTED: "Cotizada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

export function MobileRequestConfirmScreen({
  session,
  requestId,
  onBack,
  onOpenList,
}: {
  session: AuthenticatedSession;
  requestId: string;
  onBack: () => void;
  onOpenList: () => void;
}) {
  const [request, setRequest] = useState<ProductRequestView | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyProductRequest(apiBase, session.accessToken, requestId)
      .then((item) => {
        if (!cancelled) setRequest(item);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, session.accessToken]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>← Seguir explorando</Text>
      </Pressable>
      {error ? <Text style={styles.error}>No encontramos la solicitud.</Text> : null}
      {!error && !request ? <Text style={styles.body}>Cargando…</Text> : null}
      {request ? (
        <>
          <Text style={styles.success}>✓</Text>
          <Text accessibilityRole="header" style={styles.title}>
            ¡Solicitud recibida!
          </Text>
          <Text style={styles.body}>Revisaremos tu producto y te prepararemos una cotización.</Text>
          <View style={styles.card}>
            <Text style={styles.meta}>ID</Text>
            <Text style={styles.heading}>{request.requestNumber}</Text>
            <Text style={styles.meta}>Estado</Text>
            <Text style={styles.heading}>{statusLabel[request.status]}</Text>
            <Text style={styles.meta}>Cantidad</Text>
            <Text style={styles.heading}>{request.quantity}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onOpenList} style={styles.primary}>
            <Text style={styles.primaryText}>Ver mis cotizaciones</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

export function MobileMyQuotesScreen({
  session,
  onBack,
  onOpenDetail,
}: {
  session: AuthenticatedSession;
  onBack: () => void;
  onOpenDetail: (id: string) => void;
}) {
  const [items, setItems] = useState<ProductRequestView[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listMyProductRequests(apiBase, session.accessToken, { page: 1, pageSize: 50 })
      .then((page) => {
        if (!cancelled) setItems(page.items);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>← Perfil</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Mis cotizaciones
      </Text>
      {error ? <Text style={styles.error}>No pudimos cargar tus cotizaciones.</Text> : null}
      {!error && !items ? <Text style={styles.body}>Cargando…</Text> : null}
      {items?.length === 0 ? <Text style={styles.body}>Aún no tienes solicitudes.</Text> : null}
      {items?.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" onPress={() => onOpenDetail(item.id)} style={styles.card}>
          <Text style={styles.heading}>{item.productName || item.requestNumber}</Text>
          <Text style={styles.meta}>
            {item.requestNumber} · {statusLabel[item.status]}
          </Text>
          {item.quote ? <Text style={styles.heading}>{formatUsdFromMinor(item.quote.totalMinor)}</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function MobileQuoteDetailScreen({
  session,
  requestId,
  onBack,
}: {
  session: AuthenticatedSession;
  requestId: string;
  onBack: () => void;
}) {
  const [request, setRequest] = useState<ProductRequestView | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function reload(): Promise<void> {
    const next = await getMyProductRequest(apiBase, session.accessToken, requestId);
    setRequest(next);
  }

  useEffect(() => {
    let cancelled = false;
    reload().catch(() => {
      if (!cancelled) setError("No encontramos esta solicitud.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, session.accessToken]);

  async function onAccept(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await acceptProductQuote(apiBase, session.accessToken, requestId);
      setMessage("Cotización aceptada. Pedido pendiente de pago.");
      await reload();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        setMessage("Esta cotización ya fue procesada.");
        await reload().catch(() => undefined);
      } else {
        setError("No pudimos aceptar la cotización.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onReject(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await rejectProductQuote(apiBase, session.accessToken, requestId, reason.trim() || undefined);
      setMessage("Cotización rechazada.");
      await reload();
    } catch {
      setError("No pudimos rechazar la cotización.");
    } finally {
      setBusy(false);
    }
  }

  const actionable = request?.quote?.status === "SENT";

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>← Mis cotizaciones</Text>
      </Pressable>
      {!request && !error ? <Text style={styles.body}>Cargando…</Text> : null}
      {request ? (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            {request.productName || request.requestNumber}
          </Text>
          <Text style={styles.meta}>
            {request.requestNumber} · {statusLabel[request.status]}
          </Text>
          {request.quote && request.quote.status !== "DRAFT" ? (
            <View style={styles.card}>
              <Text style={styles.heading}>Total {formatUsdFromMinor(request.quote.totalMinor)}</Text>
              <Text style={styles.meta}>Subtotal {formatUsdFromMinor(request.quote.productSubtotalMinor)}</Text>
              <Text style={styles.meta}>Envío VE {formatUsdFromMinor(request.quote.internationalShippingMinor)}</Text>
            </View>
          ) : (
            <Text style={styles.body}>Estamos revisando tu solicitud.</Text>
          )}
          {message ? <Text style={styles.ok}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {actionable ? (
            <>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void onAccept()} style={styles.primary}>
                <Text style={styles.primaryText}>{busy ? "Procesando…" : "Aceptar cotización"}</Text>
              </Pressable>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Motivo de rechazo (opcional)"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void onReject()} style={styles.secondary}>
                <Text style={styles.secondaryText}>Rechazar</Text>
              </Pressable>
            </>
          ) : null}
        </>
      ) : null}
      {error && !request ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: spaceTokens[3], padding: spaceTokens[4], paddingBottom: spaceTokens[8] },
  linkHit: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  link: { color: colors.primary, fontWeight: "700" },
  title: { color: colors.deep, fontSize: 22, fontWeight: "800" },
  heading: { color: colors.deep, fontWeight: "700" },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.muted, fontSize: 13 },
  success: { color: "#15803D", fontSize: 40, fontWeight: "800", textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    minHeight: 48,
  },
  primaryText: { color: colors.primaryOn, fontWeight: "700" },
  secondary: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryText: { color: "#B91C1C", fontWeight: "700" },
  input: {
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    color: colors.deep,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  error: { color: "#B91C1C" },
  ok: { color: "#15803D" },
});
