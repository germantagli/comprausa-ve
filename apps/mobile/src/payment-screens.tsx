import {
  ApiClientError,
  acceptQuote,
  createPayment,
  enrollTotp,
  getAccountProfile,
  getPaymentMethods,
  listProofQueue,
  publishQuoteAmount,
  rejectPayment,
  submitProof,
  verifyPayment,
  verifyTotp,
  type AccountProfile,
  type AuthenticatedSession,
  type PaymentMethods,
  type PaymentView,
  type QuoteView,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { formatUsdFromMinor } from "@comprausa/utils";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiBase } from "./api";

const colors = colorTokens.light;
const reviewRoles = new Set(["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_AGENT"]);

export function MobilePaymentPanel({
  quote,
  session,
  onChanged,
}: {
  quote: QuoteView;
  session: AuthenticatedSession;
  onChanged: () => void;
}) {
  const [methods, setMethods] = useState<PaymentMethods | "loading" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"ZELLE" | "PAGO_MOVIL" | null>(null);
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(quote.order ? String(quote.order.grandTotalMinor) : "");
  const [proof, setProof] = useState("");

  useEffect(() => {
    if (quote.status !== "ACCEPTED") {
      return;
    }
    let cancelled = false;
    setMethods("loading");
    getPaymentMethods(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setMethods(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMethods("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [quote.status, session.accessToken, attempt]);

  if (quote.status === "PENDING_VALIDATION") {
    return <Text style={styles.body}>No puedes pagar esta cotización hasta que un operador publique el importe.</Text>;
  }
  if (quote.status === "FINAL" && quote.snapshot) {
    return (
      <View>
        <Text style={styles.body}>Importe publicado: {formatUsdFromMinor(quote.snapshot.knownMinor)}. Puedes aceptarla. No puedes marcarla como pagada.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            setError(null);
            acceptQuote(apiBase, session.accessToken, quote.id)
              .then(() => onChanged())
              .catch(() => setError("No pudimos aceptar la cotización."))
              .finally(() => setBusy(false));
          }}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>{busy ? "Espera…" : "Aceptar cotización"}</Text>
        </Pressable>
      </View>
    );
  }
  if (quote.payment && (quote.payment.status === "PROOF_SUBMITTED" || quote.payment.status === "UNDER_REVIEW")) {
    return <Text style={styles.heading}>Tu pago está en revisión.</Text>;
  }
  if (quote.payment?.status === "VERIFIED" || quote.order?.status === "PAID" || quote.order?.purchasedFromStore) {
    return (
      <Text style={styles.body}>
        {quote.order?.purchasedFromStore
          ? "Pago verificado. La compra en la tienda quedó registrada. El seguimiento está en Pedidos."
          : "Pago verificado. Todavía no se compró en la tienda."}
      </Text>
    );
  }

  return (
    <View>
      {quote.payment?.status === "REJECTED" ? <Text style={styles.error}>Rechazado. {quote.payment.rejectionReason ?? "Sin motivo."}</Text> : null}
      {methods === "loading" ? <Text style={styles.body}>Cargando…</Text> : null}
      {methods === "error" ? (
        <View>
          <Text style={styles.error}>No pudimos cargar los métodos.</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((current) => current + 1)} style={styles.primary}>
            <Text style={styles.primaryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {methods !== "loading" && methods !== "error" ? (
        <View>
          <Text style={styles.heading}>Elige un método</Text>
          <Text style={styles.body}>{methods.stripe.detail}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={!methods.stripe.configured || busy}
            onPress={() => void pay({ method: "STRIPE", idempotencyKey: `${Date.now()}` })}
            style={styles.secondary}
          >
            <Text style={styles.body}>Stripe</Text>
          </Pressable>
          <Text style={styles.body}>{methods.paypal.detail}</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void pay({ method: "PAYPAL" })} style={styles.secondary}>
            <Text style={styles.body}>PayPal</Text>
          </Pressable>
          <Text style={styles.body}>{methods.zelle.detail}</Text>
          <Pressable accessibilityRole="button" onPress={() => setMethod("ZELLE")} style={styles.secondary}>
            <Text style={styles.body}>Zelle</Text>
          </Pressable>
          <Text style={styles.body}>{methods.pagoMovil.detail}</Text>
          <Pressable accessibilityRole="button" onPress={() => setMethod("PAGO_MOVIL")} style={styles.secondary}>
            <Text style={styles.body}>Pago Móvil</Text>
          </Pressable>
          {method ? (
            <View>
              {method === "PAGO_MOVIL" ? (
                <>
                  <Field label="Banco" value={bank} onChange={setBank} />
                  <Field label="Teléfono" value={phone} onChange={setPhone} />
                  <Field label="Importe en centavos" value={amount} onChange={setAmount} />
                </>
              ) : null}
              <Field label="Referencia" value={reference} onChange={setReference} />
              <Field label="Comprobante en base64" value={proof} onChange={setProof} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void payManual()} style={styles.primary}>
                <Text style={styles.primaryText}>{busy ? "Espera…" : "Enviar comprobante"}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  async function pay(body: { method: "STRIPE"; idempotencyKey: string } | { method: "PAYPAL" }) {
    setBusy(true);
    setError(null);
    try {
      const result = await createPayment(apiBase, session.accessToken, quote.id, body);
      if (result.detail) {
        setError(result.detail);
      }
      onChanged();
    } catch {
      setError("No pudimos iniciar el pago.");
    } finally {
      setBusy(false);
    }
  }

  async function payManual() {
    if (!method || proof.trim().length === 0) {
      setError("Pega el comprobante en base64. Aceptamos JPEG, PNG o PDF.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body =
        method === "ZELLE"
          ? { method: "ZELLE" as const, reference }
          : { method: "PAGO_MOVIL" as const, bank, phone, reference, amountMinor: Number(amount) };
      const created = await createPayment(apiBase, session.accessToken, quote.id, body);
      await submitProof(apiBase, session.accessToken, created.payment.id, {
        contentType: "image/png",
        dataBase64: proof.trim(),
      });
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.status === 409 ? "Esa referencia ya está registrada." : "No pudimos enviar el comprobante.");
    } finally {
      setBusy(false);
    }
  }
}

export function MobileOperatorScreen({
  session,
  onSession,
  onBack,
}: {
  session: AuthenticatedSession;
  onSession: (session: AuthenticatedSession) => void;
  onBack: () => void;
}) {
  const [profile, setProfile] = useState<AccountProfile | "loading" | "error">("loading");
  const [queue, setQueue] = useState<PaymentView[] | "loading" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfile("loading");
    getAccountProfile(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setProfile(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session.accessToken, attempt]);

  useEffect(() => {
    if (profile === "loading" || profile === "error" || !profile.mfaSatisfied || !reviewRoles.has(profile.role)) {
      return;
    }
    let cancelled = false;
    setQueue("loading");
    listProofQueue(apiBase, session.accessToken)
      .then((next) => {
        if (!cancelled) {
          setQueue(next.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQueue("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile, session.accessToken, attempt]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkHit}>
        <Text style={styles.link}>Volver</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Revisión
      </Text>
      {profile === "loading" ? <Text style={styles.body}>Cargando…</Text> : null}
      {profile === "error" ? (
        <View>
          <Text style={styles.error}>No pudimos cargar la revisión.</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((current) => current + 1)} style={styles.primary}>
            <Text style={styles.primaryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {profile !== "loading" && profile !== "error" && !reviewRoles.has(profile.role) ? (
        <Text style={styles.body}>Esta pantalla es para finanzas.</Text>
      ) : null}
      {profile !== "loading" && profile !== "error" && reviewRoles.has(profile.role) && !profile.mfaSatisfied ? (
        <View>
          <Text style={styles.body}>Confirma el segundo factor después del OTP.</Text>
          {secret ? <Text style={styles.body}>Clave de configuración: {secret}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              enrollTotp(apiBase, session.accessToken)
                .then((next) => setSecret(next.secret))
                .catch(() => setError("No pudimos preparar el segundo factor."))
                .finally(() => setBusy(false));
            }}
            style={styles.secondary}
          >
            <Text style={styles.body}>Preparar clave</Text>
          </Pressable>
          <Field label="Código de 6 dígitos" value={code} onChange={setCode} />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              verifyTotp(apiBase, session.accessToken, code)
                .then((next) => {
                  onSession({ ...session, accessToken: next.accessToken, expiresInSeconds: next.expiresInSeconds });
                  setAttempt((current) => current + 1);
                })
                .catch(() => setError("El código no sirvió."))
                .finally(() => setBusy(false));
            }}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Confirmar</Text>
          </Pressable>
        </View>
      ) : null}
      {profile !== "loading" && profile !== "error" && profile.mfaSatisfied && reviewRoles.has(profile.role) ? (
        <View>
          <Text style={styles.body}>Escribe el importe final en centavos. Verificar un pago no compra el artículo en la tienda.</Text>
          <Field label="Identificador de la cotización" value={quoteId} onChange={setQuoteId} />
          <Field label="Importe en centavos" value={amount} onChange={setAmount} />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              setError(null);
              publishQuoteAmount(apiBase, session.accessToken, quoteId.trim(), Number(amount))
                .then(() => setMessage("Importe publicado."))
                .catch(() => setError("No pudimos publicar el importe."))
                .finally(() => setBusy(false));
            }}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>{busy ? "Espera…" : "Publicar importe"}</Text>
          </Pressable>
          <Text style={styles.heading}>Comprobantes</Text>
          {queue === "loading" ? <Text style={styles.body}>Cargando…</Text> : null}
          {queue === "error" ? <Text style={styles.error}>No pudimos cargar los comprobantes.</Text> : null}
          {Array.isArray(queue) && queue.length === 0 ? <Text style={styles.body}>No hay comprobantes en revisión.</Text> : null}
          {Array.isArray(queue)
            ? queue.map((payment) => (
                <View key={payment.id} style={styles.card}>
                  <Text style={styles.heading}>{payment.method}</Text>
                  <Text style={styles.body}>{formatUsdFromMinor(payment.amountMinor)}</Text>
                  <Text style={styles.body}>Referencia: {payment.reference ?? "Sin referencia."}</Text>
                  <Text style={styles.body}>{payment.proof ? `Comprobante recibido (${payment.proof.contentType}).` : "Sin comprobante."}</Text>
                  <Field label="Motivo" value={reason} onChange={setReason} />
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => void review(payment.id, "verify")} style={styles.primary}>
                    <Text style={styles.primaryText}>Verificar pago</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => void review(payment.id, "reject")} style={styles.secondary}>
                    <Text style={styles.body}>Rechazar</Text>
                  </Pressable>
                </View>
              ))
            : null}
        </View>
      ) : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );

  async function review(paymentId: string, action: "verify" | "reject") {
    setBusy(true);
    setError(null);
    try {
      if (action === "verify") {
        await verifyPayment(apiBase, session.accessToken, paymentId);
        setMessage("Pago verificado. El pedido quedó pagado y no se compró en la tienda.");
      } else {
        if (!reason.trim()) {
          setError("Escribe el motivo del rechazo.");
          return;
        }
        await rejectPayment(apiBase, session.accessToken, paymentId, reason.trim());
        setMessage("Comprobante rechazado.");
      }
      setAttempt((current) => current + 1);
    } catch {
      setError("No pudimos actualizar el pago.");
    } finally {
      setBusy(false);
    }
  }
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View>
      <Text style={styles.body}>{label}</Text>
      <TextInput accessibilityLabel={label} onChangeText={onChange} style={styles.input} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, padding: spaceTokens[4], paddingBottom: spaceTokens[8] },
  title: { color: colors.text, fontSize: fontTokens.sizes.title, lineHeight: fontTokens.lineHeight.title, marginBottom: spaceTokens[3] },
  heading: { color: colors.text, fontSize: fontTokens.sizes.body, lineHeight: fontTokens.lineHeight.body, marginBottom: spaceTokens[2] },
  body: { color: colors.text, fontSize: fontTokens.sizes.body, lineHeight: fontTokens.lineHeight.body, marginBottom: spaceTokens[3] },
  link: { color: colors.primary, fontSize: fontTokens.sizes.body },
  linkHit: { justifyContent: "center", minHeight: 44 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.deep,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    color: colors.text,
    marginBottom: spaceTokens[3],
    minHeight: 44,
    paddingHorizontal: spaceTokens[3],
  },
  primary: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    marginBottom: spaceTokens[3],
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  primaryText: { color: colors.primaryOn, fontSize: fontTokens.sizes.body },
  secondary: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.deep,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: spaceTokens[2],
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  card: { backgroundColor: colors.surface, borderRadius: radiusTokens.md, marginBottom: spaceTokens[3], padding: spaceTokens[4] },
  error: { color: colors.error, fontSize: fontTokens.sizes.body, marginBottom: spaceTokens[3] },
  success: { color: colors.success, fontSize: fontTokens.sizes.body, marginBottom: spaceTokens[3] },
});
