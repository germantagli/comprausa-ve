import {
  ApiClientError,
  exchangeOAuth,
  registerAccount,
  requestOtpChallenge,
  revokeSession,
  verifyOtp,
  type AuthenticatedSession,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import {
  PHONE_OTP_ENABLED,
  composeE164,
  formatE164Display,
  getDefaultCountry,
  type CountryDialCode,
} from "@comprausa/utils";
import { emailSchema, otpCodeSchema, personNameSchema } from "@comprausa/validation";
import { useEffect, useRef, useState, type ElementRef } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type OtpInputRef = ElementRef<typeof TextInput>;
import { apiBase } from "./api";
import { CountryDialPicker } from "./country-dial-picker";
import { readOrCreateDeviceId } from "./session-store";
import {
  mobileOauthConfigured,
  requestAppleIdTokenNative,
  useGoogleAuthRequest,
} from "./social-sign-in";

const colors = colorTokens.light;
const OTP_LENGTH = 6;
const RESEND_FALLBACK_SECONDS = 45;
/** Public legal pages on the TraeLo web (same copy as web /entrar). */
const LEGAL_BASE = "https://comprausaweb-production.up.railway.app";

const cart = require("../assets/brand/splash/cart.png");
const googleMark = require("../assets/brand/auth/google-mark.png");
const appleMark = require("../assets/brand/auth/apple-mark.png");

type Channel = "email" | "phone";
type Step = "destination" | "code" | "name" | "done";
type Mode = "registro" | "entrar";

const topInset = Platform.select({
  ios: 52,
  android: (StatusBar.currentHeight ?? 0) + spaceTokens[3],
  default: spaceTokens[4],
})!;

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
  const [deviceId, setDeviceId] = useState("");
  const [step, setStep] = useState<Step>("destination");
  const [channel, setChannel] = useState<Channel>(PHONE_OTP_ENABLED ? "phone" : "email");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<CountryDialCode>(() => getDefaultCountry());
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
  const [googleRequest, , googlePrompt] = useGoogleAuthRequest();

  const code = digits.join("");
  const headline = mode === "entrar" ? "Inicia sesión" : "Crea tu cuenta";

  useEffect(() => {
    let cancelled = false;
    void readOrCreateDeviceId().then((id) => {
      if (!cancelled) {
        setDeviceId(id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function requestChallenge(nextDestination: string, nextChannel: Channel): Promise<boolean> {
    if (!deviceId) {
      setError("Preparando el dispositivo… Intenta de nuevo.");
      return false;
    }
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
    if (!PHONE_OTP_ENABLED) {
      setError("El ingreso por teléfono no está disponible. Usa email, Google o Apple.");
      return;
    }
    const e164 = composeE164(country.dial, phoneLocal);
    if (!e164) {
      setError("Revisa el número. Incluye el código de país correcto y el número nacional.");
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

  async function finishOAuth(input: {
    provider: "google" | "apple";
    idToken: string;
    givenName?: string;
    familyName?: string;
  }): Promise<void> {
    const result = await exchangeOAuth(apiBase, {
      provider: input.provider,
      idToken: input.idToken,
      deviceId,
      platform,
      givenName: input.givenName,
      familyName: input.familyName,
    });
    if (result.status === "throttled") {
      setError("Espera un momento e intenta otra vez.");
      return;
    }
    if (result.status === "rejected") {
      setError("No pudimos validar ese acceso. Intenta de nuevo o usa email/teléfono.");
      return;
    }
    if (result.status === "profile_required") {
      setRegistrationToken(result.registrationToken);
      setStep("name");
      return;
    }
    setSession(result);
    setStep("done");
    onAuthenticated?.(result);
  }

  async function continueWithSocial(provider: "google" | "apple"): Promise<void> {
    const configured = mobileOauthConfigured();
    if (provider === "google" && !configured.google) {
      setSocialNote(
        "Google aún no tiene Client ID. Añade EXPO_PUBLIC_GOOGLE_CLIENT_ID y GOOGLE_CLIENT_IDS en la API.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    setSocialNote(null);
    try {
      if (provider === "google") {
        if (!googleRequest) {
          setSocialNote("Google AuthSession no está listo. Revisa EXPO_PUBLIC_GOOGLE_CLIENT_ID.");
          return;
        }
        const outcome = await googlePrompt();
        const idToken =
          outcome?.type === "success"
            ? (outcome.params.id_token as string | undefined) ?? outcome.authentication?.idToken ?? undefined
            : undefined;
        if (!idToken) {
          setSocialNote("Inicio con Google cancelado. Puedes usar email o teléfono.");
          return;
        }
        await finishOAuth({ provider: "google", idToken });
        return;
      }
      const apple = await requestAppleIdTokenNative();
      await finishOAuth({
        provider: "apple",
        idToken: apple.idToken,
        givenName: apple.givenName,
        familyName: apple.familyName,
      });
    } catch (caught) {
      if (caught instanceof Error && caught.message.includes("apple_unavailable")) {
        setSocialNote("Sign in with Apple solo está disponible en iOS. En Android usa Google, email o teléfono.");
        return;
      }
      setError(failureMessage(caught, "destination"));
    } finally {
      setLoading(false);
    }
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
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}
        keyboardShouldPersistTaps="handled"
      >
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
              onPress={() => onAuthenticated?.(session)}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Ir al inicio</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading, busy: loading }}
              disabled={loading}
              onPress={() => void logout()}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>{loading ? "Espera…" : "Cerrar sesión"}</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {step === "destination" ? (
              <>
                <Text accessibilityRole="header" style={styles.title}>
                  {headline}
                </Text>
                <Text style={styles.subtitle}>
                  {PHONE_OTP_ENABLED
                    ? "Usa tu correo o teléfono. También puedes continuar con Google o Apple."
                    : "Usa tu correo. También puedes continuar con Google o Apple."}
                </Text>
                {PHONE_OTP_ENABLED ? (
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
                ) : null}

                {PHONE_OTP_ENABLED && channel === "phone" ? (
                  <View style={styles.phoneRow}>
                    <CountryDialPicker value={country} onChange={setCountry} />
                    <TextInput
                      accessibilityLabel="Número de teléfono"
                      autoComplete="tel"
                      inputMode="numeric"
                      keyboardType="number-pad"
                      onChangeText={setPhoneLocal}
                      placeholder={country.iso2 === "VE" ? "412 345 6789" : "Número"}
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
                    accessibilityLabel="Continuar con Google"
                    accessibilityState={{ disabled: loading }}
                    disabled={loading}
                    onPress={() => void continueWithSocial("google")}
                    style={styles.social}
                  >
                    <Image source={googleMark} style={styles.socialIcon} resizeMode="contain" />
                    <Text style={styles.socialText}>Google</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continuar con Apple"
                    accessibilityState={{ disabled: loading }}
                    disabled={loading}
                    onPress={() => void continueWithSocial("apple")}
                    style={styles.social}
                  >
                    <Image source={appleMark} style={styles.socialIcon} resizeMode="contain" />
                    <Text style={styles.socialText}>Apple</Text>
                  </Pressable>
                </View>
                {socialNote ? <Text style={styles.hint}>{socialNote}</Text> : null}
                <Text style={styles.legal}>
                  Al continuar aceptas nuestros{" "}
                  <Text
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(`${LEGAL_BASE}/terminos`)}
                    style={styles.legalLink}
                  >
                    Términos y Condiciones
                  </Text>{" "}
                  y{" "}
                  <Text
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(`${LEGAL_BASE}/privacidad`)}
                    style={styles.legalLink}
                  >
                    Política de Privacidad
                  </Text>
                  .
                </Text>
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
                    {channel === "phone" ? formatE164Display(destination, country.dial) : destination}
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
                {__DEV__ ? (
                  <Text style={styles.hint}>
                    En desarrollo el código se consulta en POST /v1/auth/dev/otp-code si la API usa OTP_PROVIDER=simulated.
                  </Text>
                ) : null}
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
    return "El ingreso no está disponible en este momento. En producción el OTP requiere un proveedor real (OTP_PROVIDER distinto de simulated).";
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
  secondary: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: "center",
    marginTop: spaceTokens[3],
    minHeight: 48,
  },
  secondaryText: {
    color: colors.primary,
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
    gap: spaceTokens[2],
    justifyContent: "center",
    minHeight: 72,
    paddingVertical: spaceTokens[3],
  },
  socialIcon: {
    height: 28,
    width: 28,
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
  legalLink: {
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
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
