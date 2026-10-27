"use client";

import {
  ApiClientError,
  registerAccount,
  requestOtpChallenge,
  revokeSession,
  verifyOtp,
  type AuthenticatedSession,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { otpCodeSchema, personNameSchema, phoneE164Schema, emailSchema } from "@comprausa/validation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { apiBase } from "../lib/api";
import { clearSession, DEVICE_KEY, readSession, saveSession } from "../lib/session";

const colors = colorTokens.light;
const isDevClient = process.env.NODE_ENV === "development";

type Channel = "email" | "phone";
type Step = "channel" | "destination" | "code" | "name" | "done";

function createDeviceId(): string {
  return crypto.randomUUID();
}

function readDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }
  const created = createDeviceId();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

/** Solo en desarrollo: el endpoint /v1/auth/dev/otp-code no existe fuera de OTP simulado. */
async function fetchSimulatedOtp(channel: Channel, destination: string): Promise<string | null> {
  if (!isDevClient) {
    return null;
  }
  try {
    const response = await fetch(`${apiBase}/v1/auth/dev/otp-code`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel, destination }),
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { code?: string };
    return typeof data.code === "string" ? data.code : null;
  } catch {
    return null;
  }
}

export function SignInForm() {
  const router = useRouter();
  const errorId = useId();
  const hintId = useId();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("channel");
  const [channel, setChannel] = useState<Channel>("email");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDeviceId(readDeviceId());
    const stored = readSession();
    if (stored) {
      setSession(stored);
      setStep("done");
    }
    setReady(true);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
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
      setDevHint(null);
      try {
        const result = await requestOtpChallenge(apiBase, {
          channel,
          destination: parsed.data,
          deviceId,
        });
        if (result.status === "throttled") {
          setError("Espera un momento e intenta otra vez.");
          return;
        }
        setDestination(parsed.data);
        if (isDevClient) {
          const simulated = await fetchSimulatedOtp(channel, parsed.data);
          if (simulated) {
            setCode(simulated);
            setDevHint("Código de desarrollo (OTP simulado). Solo aparece con NODE_ENV=development y OTP_PROVIDER=simulated.");
          } else {
            setDevHint(
              "En local el código se lee en POST /v1/auth/dev/otp-code si la API arrancó con OTP_PROVIDER=simulated. En producción el código solo llega si hay proveedor real; no hay bypass.",
            );
          }
        }
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
        const result = await verifyOtp(apiBase, { channel, destination, code, deviceId, platform: "WEB" });
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
          setDevHint(null);
          setStep("name");
          return;
        }
        saveSession(result);
        setSession(result);
        setCode("");
        setDevHint(null);
        setStep("done");
        router.push("/");
      } catch (caught) {
        setError(failureMessage(caught, "code"));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === "name") {
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
          platform: "WEB",
        });
        saveSession(result);
        setSession(result);
        setStep("done");
        router.push("/");
      } catch (caught) {
        setError(failureMessage(caught, "name"));
      } finally {
        setLoading(false);
      }
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
      clearSession();
      setSession(null);
      setStep("channel");
    } catch (caught) {
      setError(failureMessage(caught, "done"));
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main style={pageStyle} aria-busy="true">
        <h1 style={titleStyle}>Entrar</h1>
        <p style={bodyStyle}>Cargando…</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <style>{`
        .entrar-control:focus-visible { outline: 3px solid ${colors.primary}; outline-offset: 2px; }
      `}</style>
      <p style={{ color: colors.deep, fontSize: fontTokens.sizes.title, fontWeight: 800, letterSpacing: "-0.02em", margin: `0 0 ${spaceTokens[4]}px` }}>
        CompraUSA
      </p>
      <h1 style={titleStyle}>{stepTitle(step, channel)}</h1>
      <p style={{ color: colors.muted, fontSize: fontTokens.sizes.caption, lineHeight: `${fontTokens.lineHeight.caption}px`, margin: `0 0 ${spaceTokens[4]}px` }}>
        {stepBlurb(step)}
      </p>
      {step === "done" && session ? (
        <div>
          <p role="status" style={successStyle}>
            Listo, ya entraste.
          </p>
          <p style={bodyStyle}>
            <Link href="/" style={{ ...buttonStyle, alignItems: "center", display: "inline-flex", textDecoration: "none" }}>
              Ir al inicio
            </Link>
          </p>
          <button className="entrar-control" type="button" style={secondaryButtonStyle} onClick={() => void logout()} disabled={loading}>
            {loading ? "Espera…" : "Cerrar sesión"}
          </button>
          {error ? (
            <p id={errorId} role="alert" style={errorStyle}>
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} aria-busy={loading} noValidate>
          {step === "channel" ? (
            <fieldset style={fieldsetStyle}>
              <legend style={legendStyle}>¿Cómo quieres entrar?</legend>
              <label style={choiceStyle}>
                <input
                  className="entrar-control"
                  type="radio"
                  name="channel"
                  value="email"
                  checked={channel === "email"}
                  onChange={() => setChannel("email")}
                />
                Correo
              </label>
              <label style={choiceStyle}>
                <input
                  className="entrar-control"
                  type="radio"
                  name="channel"
                  value="phone"
                  checked={channel === "phone"}
                  onChange={() => setChannel("phone")}
                />
                Teléfono
              </label>
            </fieldset>
          ) : null}
          {step === "destination" ? (
            <label style={labelStyle}>
              {channel === "email" ? "Correo" : "Teléfono"}
              <input
                className="entrar-control"
                style={inputStyle}
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                type={channel === "email" ? "email" : "tel"}
                inputMode={channel === "email" ? "email" : "tel"}
                autoComplete={channel === "email" ? "email" : "tel"}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                required
              />
              <span id={hintId} style={hintStyle}>
                {channel === "email" ? "Usa el correo completo." : "Incluye el código de país, por ejemplo +58."}
              </span>
            </label>
          ) : null}
          {step === "code" ? (
            <label style={labelStyle}>
              Código OTP
              <input
                className="entrar-control"
                style={inputStyle}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                required
              />
              <span id={hintId} style={hintStyle}>
                {isDevClient
                  ? (devHint ??
                    "En desarrollo el código se consulta en la API (OTP simulado). En producción solo llega con proveedor real.")
                  : "El código solo llega si el entorno tiene un proveedor OTP real. No hay bypass de producción."}
              </span>
            </label>
          ) : null}
          {step === "name" ? (
            <fieldset style={fieldsetStyle}>
              <legend style={legendStyle}>Registro · ¿Cómo te llamas?</legend>
              <label style={labelStyle}>
                Nombre
                <input
                  className="entrar-control"
                  style={inputStyle}
                  value={givenName}
                  onChange={(event) => setGivenName(event.target.value)}
                  autoComplete="given-name"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  required
                />
              </label>
              <label style={labelStyle}>
                Apellido
                <input
                  className="entrar-control"
                  style={inputStyle}
                  value={familyName}
                  onChange={(event) => setFamilyName(event.target.value)}
                  autoComplete="family-name"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  required
                />
              </label>
            </fieldset>
          ) : null}
          {error ? (
            <p id={errorId} role="alert" style={errorStyle}>
              {error}
            </p>
          ) : null}
          <button className="entrar-control" type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Espera…" : submitLabel(step)}
          </button>
        </form>
      )}
      <p style={{ ...bodyStyle, marginTop: spaceTokens[6] }}>
        <Link href="/" style={{ color: colors.primary, display: "inline-flex", minHeight: 44, alignItems: "center" }}>
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}

function stepTitle(step: Step, channel: Channel): string {
  if (step === "code") {
    return "Verifica tu código";
  }
  if (step === "name") {
    return "Registro";
  }
  if (step === "destination" && channel === "phone") {
    return "Tu teléfono";
  }
  if (step === "destination") {
    return "Tu correo";
  }
  if (step === "done") {
    return "Sesión";
  }
  return "Entrar";
}

function stepBlurb(step: Step): string {
  if (step === "code") {
    return "Ingreso con un código de un solo uso. Sin contraseña.";
  }
  if (step === "name") {
    return "Primera vez: completa tu nombre para crear la cuenta.";
  }
  if (step === "done") {
    return "Sesión activa contra la API.";
  }
  return "Ingreso con un código de un solo uso. Sin contraseña.";
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

const pageStyle = {
  background: `linear-gradient(180deg, ${colors.background} 0%, ${colors.surface} 45%, ${colors.background} 100%)`,
  color: colors.text,
  fontFamily: fontTokens.family,
  fontSize: fontTokens.sizes.body,
  lineHeight: `${fontTokens.lineHeight.body}px`,
  margin: "0 auto",
  maxWidth: 480,
  minHeight: "100vh",
  padding: spaceTokens[6],
} as const;

const titleStyle = {
  fontSize: fontTokens.sizes.title,
  lineHeight: `${fontTokens.lineHeight.title}px`,
  margin: `0 0 ${spaceTokens[4]}px`,
} as const;

const bodyStyle = { margin: 0 } as const;

const fieldsetStyle = { border: "none", margin: `0 0 ${spaceTokens[4]}px`, padding: 0 } as const;

const legendStyle = { fontSize: fontTokens.sizes.body, marginBottom: spaceTokens[3], padding: 0 } as const;

const choiceStyle = {
  alignItems: "center",
  display: "flex",
  gap: spaceTokens[3],
  minHeight: 44,
} as const;

const labelStyle = { display: "grid", gap: spaceTokens[2], marginBottom: spaceTokens[4] } as const;

const inputStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.sm,
  color: colors.text,
  font: "inherit",
  minHeight: 48,
  padding: `0 ${spaceTokens[3]}px`,
  width: "100%",
} as const;

const hintStyle = { color: colors.text, fontSize: fontTokens.sizes.caption, lineHeight: `${fontTokens.lineHeight.caption}px` } as const;

const buttonStyle = {
  background: colors.primary,
  border: "none",
  borderRadius: radiusTokens.md,
  color: colors.primaryOn,
  font: "inherit",
  minHeight: 44,
  padding: `0 ${spaceTokens[4]}px`,
} as const;

const secondaryButtonStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  color: colors.text,
  font: "inherit",
  minHeight: 44,
  marginTop: spaceTokens[3],
  padding: `0 ${spaceTokens[4]}px`,
} as const;

const errorStyle = { color: colors.error, margin: `${spaceTokens[3]}px 0` } as const;

const successStyle = { color: colors.success, margin: `0 0 ${spaceTokens[4]}px` } as const;
