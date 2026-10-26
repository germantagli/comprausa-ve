import {
  ApiClientError,
  getAccountProfile,
  listFulfillmentQueue,
  listOrders,
  recordTrackingEvent,
  type AuthenticatedSession,
  type CustomerOrder,
  type OperatorOrder,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { fulfillmentLabel, formatUsdFromMinor, recordedAtLabel } from "@comprausa/utils";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const colors = colorTokens.light;
const apiBase = "http://127.0.0.1:3001";
const operatorRoles = new Set(["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_AGENT", "PROCUREMENT_AGENT", "LOGISTICS_AGENT"]);

export function MobileOrdersScreen({ session }: { session: AuthenticatedSession | null }) {
  const [items, setItems] = useState<CustomerOrder[] | "loading" | "error" | "signed-out">("loading");
  const [selected, setSelected] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!session) {
      setItems("signed-out");
      return;
    }
    let cancelled = false;
    setItems("loading");
    listOrders(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setItems(next.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, session]);

  const current = Array.isArray(items) ? items.find((order) => order.id === selected) : null;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>Pedidos</Text>
      {items === "loading" ? <Text style={styles.body}>Cargando…</Text> : null}
      {items === "signed-out" ? <Text style={styles.body}>Entra para ver tus pedidos.</Text> : null}
      {items === "error" ? (
        <View>
          <Text style={styles.error}>No pudimos cargar los pedidos.</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.primary}>
            <Text style={styles.primaryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {Array.isArray(items) && items.length === 0 ? <Text accessibilityLiveRegion="polite" style={styles.body}>No tienes pedidos activos.</Text> : null}
      {current ? <OrderTimeline order={current} onBack={() => setSelected(null)} /> : null}
      {Array.isArray(items) && !current
        ? items.map((order) => (
            <Pressable key={order.id} accessibilityRole="button" onPress={() => setSelected(order.id)} style={styles.card}>
              <Text style={styles.heading}>{fulfillmentLabel(order.status)}</Text>
              <Text style={styles.body}>{formatUsdFromMinor(order.grandTotalMinor)}</Text>
              <Text style={styles.body}>{order.purchasedFromStore ? "La compra en la tienda quedó registrada. No hay una fecha de entrega." : "Todavía no se compró en la tienda."}</Text>
              <Text style={styles.link}>Ver la línea de tiempo</Text>
            </Pressable>
          ))
        : null}
    </ScrollView>
  );
}

function OrderTimeline({ order, onBack }: { order: CustomerOrder; onBack: () => void }) {
  return (
    <View>
      <Text style={styles.heading}>{fulfillmentLabel(order.status)}</Text>
      <Text style={styles.body}>{order.purchasedFromStore ? "La compra en la tienda quedó registrada. No hay una fecha de entrega." : "Todavía no se compró en la tienda."}</Text>
      <Text style={styles.heading}>Línea de tiempo</Text>
      {order.timeline.length === 0 ? <Text style={styles.body}>Sin movimientos de compra ni de envío.</Text> : null}
      {order.timeline.map((event) => (
        <View key={event.id} style={styles.card}>
          <Text style={styles.heading}>{fulfillmentLabel(event.status)}</Text>
          <Text style={styles.body}>{event.note}</Text>
          <Text style={styles.body}>{recordedAtLabel(event.occurredAt)}</Text>
        </View>
      ))}
      <Text style={styles.heading}>Avisos</Text>
      {order.notices.length === 0 ? <Text style={styles.body}>No hay avisos.</Text> : null}
      {order.notices.map((notice) => (
        <Text key={notice.id} style={styles.body}>{notice.message} {recordedAtLabel(notice.createdAt)}</Text>
      ))}
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>Volver a pedidos</Text>
      </Pressable>
    </View>
  );
}

export function MobileTrackingScreen({ session, onBack }: { session: AuthenticatedSession; onBack: () => void }) {
  const [role, setRole] = useState<string | null>(null);
  const [mfa, setMfa] = useState(false);
  const [items, setItems] = useState<OperatorOrder[] | "loading" | "error">("loading");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAccountProfile(apiBase, session.accessToken)
      .then((profile) => {
        if (!cancelled) {
          setRole(profile.role);
          setMfa(profile.mfaSatisfied);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  useEffect(() => {
    if (!role || !mfa || !operatorRoles.has(role)) {
      return;
    }
    let cancelled = false;
    setItems("loading");
    listFulfillmentQueue(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setItems(next.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, mfa, role, session.accessToken]);

  async function record(orderId: string, status: string): Promise<void> {
    const note = notes[orderId]?.trim() ?? "";
    if (!note) {
      setError("Escribe una nota.");
      return;
    }
    setError(null);
    try {
      await recordTrackingEvent(apiBase, session.accessToken, orderId, { status, note });
      setMessage("Movimiento registrado.");
      setAttempt((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 409 ? "Ese salto de estado no está permitido." : "No pudimos registrar el movimiento.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>Pedidos</Text>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>Volver</Text>
      </Pressable>
      {role && !operatorRoles.has(role) ? <Text style={styles.body}>Esta pantalla es para el operador.</Text> : null}
      {role && operatorRoles.has(role) && !mfa ? <Text style={styles.body}>Confirma el segundo factor en la revisión de pagos.</Text> : null}
      <Text style={styles.body}>Registra el siguiente movimiento y una nota. La fecha es la del registro. No se promete una entrega.</Text>
      {message ? <Text style={styles.heading}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items === "loading" ? <Text style={styles.body}>Cargando…</Text> : null}
      {items === "error" ? <Text style={styles.error}>No pudimos cargar la cola.</Text> : null}
      {Array.isArray(items) && items.length === 0 ? <Text style={styles.body}>No hay pedidos en la cola.</Text> : null}
      {Array.isArray(items)
        ? items.map((order) => (
            <View key={order.id} style={styles.card}>
              <Text style={styles.heading}>{fulfillmentLabel(order.status)}</Text>
              <Text style={styles.body}>{order.purchasedFromStore ? "La compra en la tienda quedó registrada." : "Todavía no se compró en la tienda."}</Text>
              {order.timeline.map((event) => (
                <Text key={event.id} style={styles.body}>{fulfillmentLabel(event.status)}. {event.note}. {recordedAtLabel(event.occurredAt)}</Text>
              ))}
              <TextInput
                style={styles.input}
                value={notes[order.id] ?? ""}
                onChangeText={(value) => setNotes((current) => ({ ...current, [order.id]: value }))}
                placeholder="Nota del movimiento"
              />
              {order.allowed.map((status) => (
                <Pressable key={status} accessibilityRole="button" onPress={() => void record(order.id, status)} style={styles.primary}>
                  <Text style={styles.primaryText}>{fulfillmentLabel(status)}</Text>
                </Pressable>
              ))}
            </View>
          ))
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, padding: spaceTokens[4], paddingBottom: spaceTokens[8] },
  title: { color: colors.text, fontSize: fontTokens.sizes.title, lineHeight: fontTokens.lineHeight.title, marginBottom: spaceTokens[3] },
  heading: { color: colors.text, fontSize: fontTokens.sizes.body, lineHeight: fontTokens.lineHeight.body, marginBottom: spaceTokens[2] },
  body: { color: colors.text, fontSize: fontTokens.sizes.body, lineHeight: fontTokens.lineHeight.body, marginBottom: spaceTokens[3] },
  link: { color: colors.primary, fontSize: fontTokens.sizes.body, lineHeight: fontTokens.lineHeight.body },
  linkHit: { justifyContent: "center", minHeight: 44 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.deep,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    marginBottom: spaceTokens[3],
    minHeight: 44,
    paddingHorizontal: spaceTokens[3],
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    marginBottom: spaceTokens[3],
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  primaryText: { color: colors.primaryOn, fontSize: fontTokens.sizes.body },
  card: { backgroundColor: colors.surface, borderRadius: radiusTokens.md, marginBottom: spaceTokens[3], padding: spaceTokens[4] },
  error: { color: colors.error, fontSize: fontTokens.sizes.body, lineHeight: fontTokens.lineHeight.body, marginBottom: spaceTokens[3] },
});
