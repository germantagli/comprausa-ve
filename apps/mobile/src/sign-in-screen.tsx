import {
  ApiClientError,
  registerAccount,
  requestOtpChallenge,
  revokeSession,
  verifyOtp,
  type AuthenticatedSession,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { emailSchema, otpCodeSchema, personNameSchema, phoneE164Schema } from "@comprausa/validation";
import { useEffect, useRef, useState, type ElementRef } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type OtpInputRef = ElementRef<typeof TextInput>;
import { apiBase } from "./api";

const colors = colorTokens.light;
const VE_DIAL = "+58";
const OTP_LENGTH = 6;
const RESEND_FALLBACK_SECONDS = 45;

const cart = require("../assets/brand/splash/cart.png");
const veDial = require("../assets/brand/auth/ve-dial.png");

type Channel = "email" | "phone";
type Step = "destination" | "code" | "name" | "done";
type Mode = "registro" | "entrar";

function createDeviceId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  const variant = bytes[8] ?? 0;
  const version = bytes[6] ?? 0;
  bytes[6] = (version & 0x0f) | 0x40;
  bytes[8] = (variant & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeVeLocal(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return digits.slice(1);
  }
  return digits;
}

function toE164Phone(localRaw: string): string | null {
  const local = normalizeVeLocal(localRaw);
  if (!/^\d{10}$/.test(local)) {
    return null;
  }
  const candidate = `${VE_DIAL}${local}`;
  return phoneE164Schema.safeParse(candidate).success ? candidate : null;
}

function formatPhoneDisplay(e164: string): string {
  if (e164.startsWith(VE_DIAL) && e164.length === 13) {
    const local = e164.slice(3);
    return `${VE_DIAL} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return e164;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const platform = Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB";

export function SignInScreen({
  mode = "registro",
  onAuthenticated,
  onCancel,
}: {
  mode?: Mode;
  onAuthenticated?: (session: AuthenticatedSession) => void;
  onCancel?: () => void;
} = {}) {
  const [deviceId] = useState(createDeviceId);
  const [step, setStep] = useState<Step>("destination");
  const [channel, setChannel] = useState<Channel>("phone");
  const [email, setEmail] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [destination, setDestination] = useState("");
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ""));
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [socialNote, setSocialNote] = useState<string | null>(null);
  const verifyingRef = useRef(false);
  const otpRefs = useRef<Array<OtpInputRef | null>>([]);

  const code = digits.join("");
  const headline = mode === "entrar" ? "Inicia sesión" : "Crea tu cuenta";

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function requestChallenge(nextDestination: string, nextChannel: Channel): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const result = await requestOtpChallenge(apiBase, {
        channel: nextChannel,
        destination: nextDestination,
        deviceId,
      });
      if (result.status === "throttled") {
        setError("Espera un momento e intenta otra vez.");
        return false;
      }
      setDestination(nextDestination);
      setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      setResendIn(Math.min(result.expiresInSeconds ?? RESEND_FALLBACK_SECONDS, RESEND_FALLBACK_SECONDS));
      setStep("code");
      return true;
    } catch (caught) {
      setError(failureMessage(caught, "destination"));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function submitDestination(): Promise<void> {
    if (channel === "email") {
      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) {
        setError("Revisa el correo.");
        return;
      }
      await requestChallenge(parsed.data, "email");
      return;
    }
    const e164 = toE164Phone(phoneLocal);
    if (!e164) {
      setError("Usa un móvil venezolano de 10 dígitos, por ejemplo 412 345 6789.");
      return;
    }
    await requestChallenge(e164, "phone");
  }

  async function submitCode(nextCode: string): Promise<void> {
    if (verifyingRef.current) {
      return;
    }
    if (!otpCodeSchema.safeParse(nextCode).success) {
      setError("No pudimos validar ese código. Intenta de nuevo.");
      return;
    }
    verifyingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await verifyOtp(apiBase, { channel, destination, code: nextCode, deviceId, platform });
      if (result.status === "throttled") {
        setError("Espera un momento e intenta otra vez.");
        return;
      }
      if (result.status === "rejected") {
        setError("No pudimos validar ese código. Intenta de nuevo.");
        setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
        otpRefs.current[0]?.focus();
        return;
      }
      if (result.status === "profile_required") {
        setRegistrationToken(result.registrationToken);
        setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
        setStep("name");
        return;
      }
      setSession(result);
      setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      setStep("done");
      onAuthenticated?.(result);
    } catch (caught) {
      setError(failureMessage(caught, "code"));
    } finally {
      verifyingRef.current = false;
      setLoading(false);
    }
  }

  async function continueFlow(): Promise<void> {
    setError(null);
    setSocialNote(null);
    if (step === "destination") {
      await submitDestination();
      return;
    }
    if (step === "code") {
      await submitCode(code);
      return;
    }
    const given = personNameSchema.safeParse(givenName);
    const family = personNameSchema.safeParse(familyName);
    if (!given.success || !family.success) {
      setError("Escribe tu nombre y tu apellido.");
      return;
    }
    setLoading(true);
    try {
      const result = await registerAccount(apiBase, {
        registrationToken,
        givenName: given.data,
        familyName: family.data,
        deviceId,
        platform,
      });
      setSession(result);
      setStep("done");
      onAuthenticated?.(result);
    } catch (caught) {
      setError(failureMessage(caught, "name"));
    } finally {
      setLoading(false);
    }
  }

  async function resendCode(): Promise<void> {
    if (resendIn > 0 || loading || !destination) {
      return;
    }
    await requestChallenge(destination, channel);
  }

  async function logout(): Promise<void> {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await revokeSession(apiBase, session.accessToken);
      setSession(null);
      setStep("destination");
    } catch (caught) {
      setError(failureMessage(caught, "done"));
    } finally {
      setLoading(false);
    }
  }

  function goBack(): void {
    setError(null);
    setSocialNote(null);
    if (step === "code" || step === "name") {
      setStep("destination");
      setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      return;
    }
    onCancel?.();
  }

  function updateDigit(index: number, value: string): void {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 1) {
      const next = [...digits];
      const chars = cleaned.slice(0, OTP_LENGTH - index).split("");
      chars.forEach((char, offset) => {
        next[index + offset] = char;
      });
      setDigits(next);
      const focusAt = Math.min(index + chars.length, OTP_LENGTH - 1);
      otpRefs.current[focusAt]?.focus();
      const joined = next.join("");
      if (joined.length === OTP_LENGTH) {
        void submitCode(joined);
      }
      return;
    }
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
    const joined = next.join("");
    if (joined.length === OTP_LENGTH && next.every(Boolean)) {
      void submitCode(joined);
    }
  }

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.brandRow}>
            <Image source={cart} style={styles.cart} resizeMode="contain" />
            <Text style={styles.wordmark}>
              <Text style={styles.wordmarkBlue}>Trae</Text>
              <Text style={styles.wordmarkOrange}>Lo</Text>
            </Text>
          </View>
          <View style={styles.backSpacer} />
        </View>

        {step === "done" && session ? (
          <View>
            <Text accessibilityRole="header" style={styles.title}>
              Sesión activa
            </Text>
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              Listo, ya entraste.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading, busy: loading }}
              disabled={loading}
              onPress={() => void logout()}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>{loading ? "Espera…" : "Cerrar sesión"}</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {step === "destination" ? (
              <>
                <Text accessibilityRole="header" style={styles.title}>
                  {headline}
                </Text>
                <View style={styles.tabs}>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: channel === "phone" }}
                    onPress={() => {
                      setChannel("phone");
                      setError(null);
                    }}
                    style={[styles.tab, channel === "phone" ? styles.tabActive : null]}
                  >
                    <Text style={[styles.tabText, channel === "phone" ? styles.tabTextActive : null]}>Teléfono</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: channel === "email" }}
                    onPress={() => {
                      setChannel("email");
                      setError(null);
                    }}
                    style={[styles.tab, channel === "email" ? styles.tabActive : null]}
                  >
                    <Text style={[styles.tabText, channel === "email" ? styles.tabTextActive : null]}>Email</Text>
                  </Pressable>
                </View>

                {channel === "phone" ? (
                  <View style={styles.phoneRow}>
                    <View style={styles.dial} accessibilityLabel="Código de país Venezuela +58">
                      <Image source={veDial} style={styles.flag} resizeMode="cover" accessibilityLabel="Venezuela" />
                      <Text style={styles.dialText}>{VE_DIAL}</Text>
                    </View>
                    <TextInput
                      accessibilityLabel="Número de teléfono"
                      autoComplete="tel"
                      inputMode="numeric"
                      keyboardType="number-pad"
                      onChangeText={setPhoneLocal}
                      placeholder="412 345 6789"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.phoneInput]}
                      value={phoneLocal}
                    />
                  </View>
                ) : (
                  <TextInput
                    accessibilityLabel="Correo"
                    autoCapitalize="none"
                    autoComplete="email"
                    inputMode="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="tu@correo.com"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={email}
                  />
                )}

                {error ? (
                  <Text accessibilityLiveRegion="assertive" style={styles.error}>
                    {error}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: loading, busy: loading }}
                  disabled={loading}
                  onPress={() => void continueFlow()}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>{loading ? "Espera…" : "Continuar"}</Text>
                </Pressable>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o continúa con</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSocialNote("Google llegará cuando conectemos OAuth. Por ahora usa teléfono o email con OTP.")}
                    style={styles.social}
                  >
                    <Text style={styles.socialText}>Google</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSocialNote("Apple llegará cuando conectemos OAuth. Por ahora usa teléfono o email con OTP.")}
                    style={styles.social}
                  >
                    <Text style={styles.socialText}>Apple</Text>
                  </Pressable>
                </View>
                {socialNote ? <Text style={styles.hint}>{socialNote}</Text> : null}
                <Text style={styles.legal}>Al continuar aceptas nuestros Términos y Condiciones y Política de Privacidad.</Text>
              </>
            ) : null}

            {step === "code" ? (
              <>
                <Text accessibilityRole="header" style={styles.title}>
                  Ingresa el código
                </Text>
                <Text style={styles.subtitle}>
                  Te enviamos un código de 6 dígitos a{" "}
                  <Text style={styles.destinationStrong}>
                    {channel === "phone" ? formatPhoneDisplay(destination) : destination}
                  </Text>
                </Text>
                <View style={styles.otpRow}>
                  {digits.map((digit, index) => (
                    <TextInput
                      key={`otp-${index}`}
                      ref={(node) => {
                        otpRefs.current[index] = node;
                      }}
                      accessibilityLabel={`Dígito ${index + 1}`}
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      inputMode="numeric"
                      keyboardType="number-pad"
                      maxLength={OTP_LENGTH}
                      onChangeText={(value) => updateDigit(index, value)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
                          otpRefs.current[index - 1]?.focus();
                        }
                      }}
                      style={styles.otpBox}
                      value={digit}
                    />
                  ))}
                </View>
                {resendIn > 0 ? (
                  <Text style={styles.resend}>Reenviar código en {formatCountdown(resendIn)}</Text>
                ) : (
                  <Pressable accessibilityRole="button" disabled={loading} onPress={() => void resendCode()}>
                    <Text style={styles.resendLink}>Reenviar código</Text>
                  </Pressable>
                )}
                <Text style={styles.hint}>En desarrollo el código se consulta en POST /v1/auth/dev/otp-code de la API.</Text>
                {error ? (
                  <Text accessibilityLiveRegion="assertive" style={styles.error}>
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: loading || code.length < OTP_LENGTH, busy: loading }}
                  disabled={loading || code.length < OTP_LENGTH}
                  onPress={() => void continueFlow()}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>{loading ? "Espera…" : "Verificar"}</Text>
                </Pressable>
              </>
            ) : null}

            {step === "name" ? (
              <>
                <Text accessibilityRole="header" style={styles.title}>
                  ¿Cómo te llamas?
                </Text>
                <Text style={styles.subtitle}>Primera vez: completa tu nombre para crear la cuenta.</Text>
                <Text style={styles.label}>Nombre</Text>
                <TextInput accessibilityLabel="Nombre" autoComplete="given-name" onChangeText={setGivenName} style={styles.input} value={givenName} />
                <Text style={styles.label}>Apellido</Text>
                <TextInput accessibilityLabel="Apellido" autoComplete="family-name" onChangeText={setFamilyName} style={styles.input} value={familyName} />
                {error ? (
                  <Text accessibilityLiveRegion="assertive" style={styles.error}>
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: loading, busy: loading }}
                  disabled={loading}
                  onPress={() => void continueFlow()}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>{loading ? "Espera…" : "Crear cuenta"}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        )}
        {step === "done" && error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function failureMessage(error: unknown, step: Step): string {
  if (error instanceof ApiClientError && error.status === 0) {
    return "No pudimos conectar con el servidor.";
  }
  if (error instanceof ApiClientError && error.status === 503) {
    return "El ingreso no está disponible en este momento.";
  }
  if (error instanceof ApiClientError && error.status === 400) {
    return step === "name" ? "Escribe tu nombre y tu apellido." : "Revisa el correo o el teléfono.";
  }
  if (step === "code") {
    return "No pudimos validar ese código. Intenta de nuevo.";
  }
  return "No pudimos conectar con el servidor.";
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  scroll: {
    paddingBottom: spaceTokens[8],
    paddingHorizontal: spaceTokens[4],
    paddingTop: spaceTokens[4],
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spaceTokens[6],
    minHeight: 44,
  },
  back: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 36,
  },
  backText: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "300",
    lineHeight: 36,
  },
  backSpacer: {
    width: 36,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spaceTokens[2],
  },
  cart: {
    height: 34,
    width: 44,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  wordmarkBlue: {
    color: colors.primary,
  },
  wordmarkOrange: {
    color: colors.accent,
  },
  title: {
    color: colors.deep,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: spaceTokens[6],
    textAlign: "center",
  },
  subtitle: {
    color: colors.primary,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[6],
    textAlign: "center",
  },
  destinationStrong: {
    color: colors.deep,
    fontWeight: "700",
  },
  tabs: {
    flexDirection: "row",
    marginBottom: spaceTokens[6],
  },
  tab: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 3,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.muted,
    fontSize: fontTokens.sizes.body,
    fontWeight: "500",
  },
  tabTextActive: {
    color: colors.deep,
    fontWeight: "700",
  },
  phoneRow: {
    flexDirection: "row",
    gap: spaceTokens[2],
    marginBottom: spaceTokens[4],
  },
  dial: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spaceTokens[2],
    minHeight: 52,
    paddingHorizontal: spaceTokens[3],
  },
  flag: {
    borderRadius: 3,
    height: 16,
    width: 24,
  },
  dialText: {
    color: colors.deep,
    fontWeight: "700",
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    marginBottom: spaceTokens[4],
    minHeight: 52,
    paddingHorizontal: spaceTokens[3],
  },
  label: {
    color: colors.deep,
    fontSize: fontTokens.sizes.body,
    fontWeight: "600",
    marginBottom: spaceTokens[2],
  },
  otpRow: {
    flexDirection: "row",
    gap: spaceTokens[2],
    marginBottom: spaceTokens[4],
  },
  otpBox: {
    borderColor: colors.primary,
    borderRadius: radiusTokens.md,
    borderWidth: 1.5,
    color: colors.deep,
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    minHeight: 56,
    textAlign: "center",
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    justifyContent: "center",
    marginTop: spaceTokens[2],
    minHeight: 54,
  },
  primaryText: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    gap: spaceTokens[3],
    marginBottom: spaceTokens[4],
    marginTop: spaceTokens[6],
  },
  dividerLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: colors.muted,
    fontSize: fontTokens.sizes.caption,
  },
  socialRow: {
    flexDirection: "row",
    gap: spaceTokens[3],
    marginBottom: spaceTokens[4],
  },
  social: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 72,
  },
  socialText: {
    color: colors.deep,
    fontWeight: "600",
  },
  legal: {
    color: colors.muted,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
    marginTop: spaceTokens[4],
    textAlign: "center",
  },
  resend: {
    color: colors.primary,
    fontSize: fontTokens.sizes.body,
    marginBottom: spaceTokens[3],
    textAlign: "center",
  },
  resendLink: {
    color: colors.primary,
    fontSize: fontTokens.sizes.body,
    fontWeight: "700",
    marginBottom: spaceTokens[3],
    textAlign: "center",
    textDecorationLine: "underline",
  },
  hint: {
    color: colors.muted,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
    marginBottom: spaceTokens[3],
    textAlign: "center",
  },
  error: {
    color: colors.error,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[3],
    textAlign: "center",
  },
  success: {
    color: colors.success,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[4],
    textAlign: "center",
  },
});
