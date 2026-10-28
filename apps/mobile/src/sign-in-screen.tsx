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
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { apiBase } from "./api";

const colors = colorTokens.light;

type Channel = "email" | "phone";
type Step = "channel" | "destination" | "code" | "name" | "done";

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

const platform = Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB";

export function SignInScreen({
  onAuthenticated,
  onCancel,
}: {
  onAuthenticated?: (session: AuthenticatedSession) => void;
  onCancel?: () => void;
} = {}) {
  const [deviceId] = useState(createDeviceId);
  const [step, setStep] = useState<Step>("channel");
  const [channel, setChannel] = useState<Channel>("email");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function continueFlow(): Promise<void> {
    setError(null);
    if (step === "channel") {
      setStep("destination");
      return;
    }
    if (step === "destination") {
      const parsed = channel === "email" ? emailSchema.safeParse(destination) : phoneE164Schema.safeParse(destination.trim());
      if (!parsed.success) {
        setError("Revisa el correo o el teléfono.");
        return;
      }
      setLoading(true);
      try {
        const result = await requestOtpChallenge(apiBase, { channel, destination: parsed.data, deviceId });
        if (result.status === "throttled") {
          setError("Espera un momento e intenta otra vez.");
          return;
        }
        setDestination(parsed.data);
        setStep("code");
      } catch (caught) {
        setError(failureMessage(caught, "destination"));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === "code") {
      if (!otpCodeSchema.safeParse(code).success) {
        setError("No pudimos validar ese código. Intenta de nuevo.");
        return;
      }
      setLoading(true);
      try {
        const result = await verifyOtp(apiBase, { channel, destination, code, deviceId, platform });
        if (result.status === "throttled") {
          setError("Espera un momento e intenta otra vez.");
          return;
        }
        if (result.status === "rejected") {
          setError("No pudimos validar ese código. Intenta de nuevo.");
          return;
        }
        if (result.status === "profile_required") {
          setRegistrationToken(result.registrationToken);
          setCode("");
          setStep("name");
          return;
        }
        setSession(result);
        setCode("");
        setStep("done");
        onAuthenticated?.(result);
      } catch (caught) {
        setError(failureMessage(caught, "code"));
      } finally {
        setLoading(false);
      }
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

  async function logout(): Promise<void> {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await revokeSession(apiBase, session.accessToken);
      setSession(null);
      setStep("channel");
    } catch (caught) {
      setError(failureMessage(caught, "done"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      {onCancel ? (
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.choice}>
          <Text style={styles.body}>Volver</Text>
        </Pressable>
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>
        Entrar
      </Text>
      {step === "done" && session ? (
        <View>
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            Listo, ya entraste.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
            disabled={loading}
            onPress={() => void logout()}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{loading ? "Espera…" : "Cerrar sesión"}</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          {step === "channel" ? (
            <View accessibilityRole="radiogroup">
              <Text style={styles.legend}>¿Cómo quieres entrar?</Text>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: channel === "email" }}
                onPress={() => setChannel("email")}
                style={styles.choice}
              >
                <Text style={styles.body}>Correo</Text>
              </Pressable>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: channel === "phone" }}
                onPress={() => setChannel("phone")}
                style={styles.choice}
              >
                <Text style={styles.body}>Teléfono</Text>
              </Pressable>
            </View>
          ) : null}
          {step === "destination" ? (
            <View>
              <Text style={styles.body}>{channel === "email" ? "Correo" : "Teléfono"}</Text>
              <TextInput
                accessibilityLabel={channel === "email" ? "Correo" : "Teléfono"}
                autoCapitalize="none"
                autoComplete={channel === "email" ? "email" : "tel"}
                inputMode={channel === "email" ? "email" : "tel"}
                keyboardType={channel === "email" ? "email-address" : "phone-pad"}
                onChangeText={setDestination}
                style={styles.input}
                value={destination}
              />
              <Text style={styles.hint}>
                {channel === "email" ? "Usa el correo completo." : "Incluye el código de país, por ejemplo +58."}
              </Text>
            </View>
          ) : null}
          {step === "code" ? (
            <View>
              <Text style={styles.body}>Código</Text>
              <TextInput
                accessibilityLabel="Código"
                autoComplete="one-time-code"
                inputMode="numeric"
                keyboardType="number-pad"
                onChangeText={setCode}
                style={styles.input}
                value={code}
              />
              <Text style={styles.hint}>En desarrollo el código no aparece aquí. Consúltalo en el endpoint de la API.</Text>
            </View>
          ) : null}
          {step === "name" ? (
            <View>
              <Text style={styles.legend}>¿Cómo te llamas?</Text>
              <Text style={styles.body}>Nombre</Text>
              <TextInput accessibilityLabel="Nombre" autoComplete="given-name" onChangeText={setGivenName} style={styles.input} value={givenName} />
              <Text style={styles.body}>Apellido</Text>
              <TextInput accessibilityLabel="Apellido" autoComplete="family-name" onChangeText={setFamilyName} style={styles.input} value={familyName} />
            </View>
          ) : null}
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
            style={styles.button}
          >
            <Text style={styles.buttonText}>{loading ? "Espera…" : submitLabel(step)}</Text>
          </Pressable>
        </View>
      )}
      {step === "done" && error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function submitLabel(step: Step): string {
  if (step === "code") {
    return "Entrar";
  }
  if (step === "name") {
    return "Crear cuenta";
  }
  return "Continuar";
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
    backgroundColor: colors.background,
    flex: 1,
    padding: spaceTokens[6],
  },
  title: {
    color: colors.text,
    fontFamily: fontTokens.family,
    fontSize: fontTokens.sizes.title,
    lineHeight: fontTokens.lineHeight.title,
    marginBottom: spaceTokens[4],
  },
  legend: {
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[3],
  },
  body: {
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
  },
  choice: {
    justifyContent: "center",
    minHeight: 44,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.deep,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontTokens.sizes.body,
    marginBottom: spaceTokens[2],
    marginTop: spaceTokens[2],
    minHeight: 44,
    paddingHorizontal: spaceTokens[3],
  },
  hint: {
    color: colors.text,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
    marginBottom: spaceTokens[4],
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radiusTokens.md,
    justifyContent: "center",
    marginTop: spaceTokens[4],
    minHeight: 44,
    paddingHorizontal: spaceTokens[4],
  },
  buttonText: {
    color: colors.primaryOn,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
  },
  error: {
    color: colors.error,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginTop: spaceTokens[3],
  },
  success: {
    color: colors.success,
    fontSize: fontTokens.sizes.body,
    lineHeight: fontTokens.lineHeight.body,
    marginBottom: spaceTokens[4],
  },
});
