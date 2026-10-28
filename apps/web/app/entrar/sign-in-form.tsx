"use client";

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
import { APP_BRAND_NAME } from "@comprausa/types";
import {
  PHONE_OTP_ENABLED,
  composeE164,
  formatE164Display,
  getDefaultCountry,
  type CountryDialCode,
} from "@comprausa/utils";
import { emailSchema, otpCodeSchema, personNameSchema } from "@comprausa/validation";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { apiBase } from "../lib/api";
import { clearSession, DEVICE_KEY, readSession, saveSession } from "../lib/session";
import { CountryDialPicker } from "./country-dial-picker";
import { oauthConfigured } from "./oauth-clients";
import { requestAppleIdToken, requestGoogleIdToken } from "./social-sign-in";

const colors = colorTokens.light;
const isDevClient = process.env.NODE_ENV === "development";
const OTP_LENGTH = 6;
const RESEND_FALLBACK_SECONDS = 45;

type Channel = "email" | "phone";
type Step = "destination" | "code" | "name" | "done";

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

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
  const searchParams = useSearchParams();
  const modo = searchParams.get("modo") === "entrar" ? "entrar" : "registro";
  const errorId = useId();
  const hintId = useId();
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("destination");
  const [channel, setChannel] = useState<Channel>(PHONE_OTP_ENABLED ? "phone" : "email");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<CountryDialCode>(() => getDefaultCountry());
  const [phoneLocal, setPhoneLocal] = useState("");
  const [destination, setDestination] = useState("");
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ""));
  const [devHint, setDevHint] = useState<string | null>(null);
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [socialNote, setSocialNote] = useState<string | null>(null);
  const verifyingRef = useRef(false);

  const code = digits.join("");
  const headline = modo === "entrar" ? "Inicia sesión" : "Crea tu cuenta";

  useEffect(() => {
    setDeviceId(readDeviceId());
    const stored = readSession();
    if (stored) {
      setSession(stored);
      setStep("done");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const startResendTimer = useCallback((expiresInSeconds?: number) => {
    const seconds = Math.max(1, Math.min(expiresInSeconds ?? RESEND_FALLBACK_SECONDS, 120));
    setResendIn(Math.min(seconds, RESEND_FALLBACK_SECONDS));
  }, []);

  async function requestChallenge(nextDestination: string, nextChannel: Channel): Promise<boolean> {
    setLoading(true);
    setDevHint(null);
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
      startResendTimer(result.expiresInSeconds);
      if (isDevClient) {
        const simulatedCode = await fetchSimulatedOtp(nextChannel, nextDestination);
        if (simulatedCode) {
          setDigits(simulatedCode.slice(0, OTP_LENGTH).split(""));
          setDevHint("Código de desarrollo (OTP simulado). Revisa los dígitos y pulsa Verificar.");
        } else {
          setDevHint(
            "En local el código se lee en POST /v1/auth/dev/otp-code si la API arrancó con OTP_PROVIDER=simulated. En producción el código solo llega con proveedor real.",
          );
        }
      }
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

  async function submitCode(
    nextCode: string,
    opts?: { channel?: Channel; destination?: string },
  ): Promise<void> {
    if (verifyingRef.current) {
      return;
    }
    if (!otpCodeSchema.safeParse(nextCode).success) {
      setError("No pudimos validar ese código. Intenta de nuevo.");
      return;
    }
    const verifyChannel = opts?.channel ?? channel;
    const verifyDestination = opts?.destination ?? destination;
    verifyingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await verifyOtp(apiBase, {
        channel: verifyChannel,
        destination: verifyDestination,
        code: nextCode,
        deviceId,
        platform: "WEB",
      });
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
        setDevHint(null);
        setStep("name");
        return;
      }
      saveSession(result);
      setSession(result);
      setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      setDevHint(null);
      setStep("done");
      router.push("/");
    } catch (caught) {
      setError(failureMessage(caught, "code"));
    } finally {
      verifyingRef.current = false;
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
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

  function onOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function onOtpPaste(event: ClipboardEvent<HTMLInputElement>): void {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) {
      return;
    }
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? "");
    setDigits(next);
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
    if (pasted.length === OTP_LENGTH) {
      void submitCode(pasted);
    }
  }

  async function resendCode(): Promise<void> {
    if (resendIn > 0 || loading || !destination) {
      return;
    }
    await requestChallenge(destination, channel);
  }

  async function continueWithSocial(provider: "google" | "apple"): Promise<void> {
    const configured = oauthConfigured();
    if (provider === "google" && !configured.google) {
      setSocialNote(
        "Google aún no tiene Client ID en este entorno. Añade NEXT_PUBLIC_GOOGLE_CLIENT_ID (y GOOGLE_CLIENT_IDS en la API).",
      );
      return;
    }
    if (provider === "apple" && !configured.apple) {
      setSocialNote(
        "Apple aún no tiene Services ID en este entorno. Añade NEXT_PUBLIC_APPLE_CLIENT_ID (y APPLE_CLIENT_IDS en la API).",
      );
      return;
    }
    setLoading(true);
    setError(null);
    setSocialNote(null);
    try {
      const tokenBundle =
        provider === "google"
          ? { idToken: await requestGoogleIdToken() }
          : await requestAppleIdToken();
      const result = await exchangeOAuth(apiBase, {
        provider,
        idToken: tokenBundle.idToken,
        deviceId,
        platform: "WEB",
        ...("givenName" in tokenBundle ? { givenName: tokenBundle.givenName, familyName: tokenBundle.familyName } : {}),
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
      saveSession(result);
      setSession(result);
      setStep("done");
      router.push("/");
    } catch (caught) {
      if (caught instanceof Error && caught.message.includes("not_configured")) {
        setSocialNote(
          provider === "google"
            ? "Falta configurar Google OAuth en este entorno."
            : "Falta configurar Sign in with Apple en este entorno.",
        );
        return;
      }
      if (caught instanceof Error && (caught.message.includes("cancelled") || caught.message.includes("sdk"))) {
        setSocialNote("Inicio cancelado. Puedes intentar otra vez o usar email/teléfono.");
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
      clearSession();
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
    if (step === "code") {
      setStep("destination");
      setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      setDevHint(null);
      return;
    }
    if (step === "name") {
      setStep("destination");
      return;
    }
    router.push("/");
  }

  if (!ready) {
    return (
      <main style={pageStyle} aria-busy="true">
        <p style={mutedStyle}>Cargando…</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <style>{`
        .entrar-control:focus-visible { outline: 3px solid ${colors.primary}; outline-offset: 2px; }
        .entrar-otp:focus { border-color: ${colors.primary}; box-shadow: 0 0 0 3px rgba(27,95,199,0.18); }
      `}</style>

      <header style={headerStyle}>
        <button type="button" className="entrar-control" onClick={goBack} aria-label="Volver" style={backButtonStyle}>
          ‹
        </button>
        <div style={brandRowStyle}>
          <Image src="/brand/splash/cart.webp" alt="" width={44} height={34} priority style={{ height: 34, width: "auto" }} />
          <p style={{ margin: 0, lineHeight: 1 }}>
            <span style={{ color: colors.primary, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>Trae</span>
            <span style={{ color: colors.accent, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>Lo</span>
          </p>
        </div>
        <span style={{ width: 36 }} aria-hidden="true" />
      </header>

      {step === "done" && session ? (
        <section>
          <h1 style={titleStyle}>Sesión activa</h1>
          <p role="status" style={successStyle}>
            Listo, ya entraste.
          </p>
          <p style={{ margin: `0 0 ${spaceTokens[4]}px` }}>
            <Link href="/" style={{ ...primaryButtonStyle, alignItems: "center", display: "inline-flex", textDecoration: "none" }}>
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
        </section>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} aria-busy={loading} noValidate>
          {step === "destination" ? (
            <>
              <h1 style={titleStyle}>{headline}</h1>
              <p style={subtitleStyle}>
                {PHONE_OTP_ENABLED
                  ? "Usa tu correo o teléfono. También puedes continuar con Google o Apple."
                  : "Usa tu correo. También puedes continuar con Google o Apple."}
              </p>
              {PHONE_OTP_ENABLED ? (
                <div role="tablist" aria-label="Método de ingreso" style={tabsStyle}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={channel === "phone"}
                    className="entrar-control"
                    onClick={() => {
                      setChannel("phone");
                      setError(null);
                    }}
                    style={tabStyle(channel === "phone")}
                  >
                    Teléfono
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={channel === "email"}
                    className="entrar-control"
                    onClick={() => {
                      setChannel("email");
                      setError(null);
                    }}
                    style={tabStyle(channel === "email")}
                  >
                    Email
                  </button>
                </div>
              ) : null}

              {PHONE_OTP_ENABLED && channel === "phone" ? (
                <div style={phoneRowStyle}>
                  <CountryDialPicker value={country} onChange={setCountry} />
                  <label style={{ ...labelStyle, flex: 1, marginBottom: 0 }}>
                    <span className="visually-hidden">Número de teléfono</span>
                    <input
                      className="entrar-control"
                      style={inputStyle}
                      value={phoneLocal}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setPhoneLocal(event.target.value)}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder={country.iso2 === "VE" ? "412 345 6789" : "Número"}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                      required
                    />
                  </label>
                </div>
              ) : (
                <label style={labelStyle}>
                  <span className="visually-hidden">Correo</span>
                  <input
                    className="entrar-control"
                    style={inputStyle}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    required
                  />
                </label>
              )}

              {error ? (
                <p id={errorId} role="alert" style={errorStyle}>
                  {error}
                </p>
              ) : null}

              <button className="entrar-control" type="submit" style={primaryButtonStyle} disabled={loading}>
                {loading ? "Espera…" : "Continuar"}
              </button>

              <div style={dividerStyle} aria-hidden="true">
                <span style={dividerLineStyle} />
                <span style={dividerTextStyle}>o continúa con</span>
                <span style={dividerLineStyle} />
              </div>

              <div style={socialRowStyle}>
                <button
                  type="button"
                  className="entrar-control"
                  style={socialButtonStyle}
                  disabled={loading}
                  onClick={() => void continueWithSocial("google")}
                >
                  <GoogleMark />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  className="entrar-control"
                  style={socialButtonStyle}
                  disabled={loading}
                  onClick={() => void continueWithSocial("apple")}
                >
                  <AppleMark />
                  <span>Apple</span>
                </button>
              </div>
              {socialNote ? (
                <p role="status" style={hintStyle}>
                  {socialNote}
                </p>
              ) : null}

              <p style={legalStyle}>
                Al continuar aceptas nuestros{" "}
                <Link href="/terminos" style={legalLinkStyle}>
                  Términos y Condiciones
                </Link>{" "}
                y{" "}
                <Link href="/privacidad" style={legalLinkStyle}>
                  Política de Privacidad
                </Link>
                .
              </p>
            </>
          ) : null}

          {step === "code" ? (
            <>
              <h1 style={titleStyle}>Ingresa el código</h1>
              <p style={subtitleStyle}>
                Te enviamos un código de 6 dígitos a{" "}
                <strong style={{ color: colors.deep, fontWeight: 700 }}>
                  {channel === "phone" ? formatE164Display(destination, country.dial) : destination}
                </strong>
              </p>
              <div
                role="group"
                aria-label="Código de 6 dígitos"
                aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                style={otpRowStyle}
              >
                {digits.map((digit, index) => (
                  <input
                    key={`otp-${index}`}
                    ref={(node) => {
                      otpRefs.current[index] = node;
                    }}
                    className="entrar-control entrar-otp"
                    style={otpBoxStyle}
                    value={digit}
                    onChange={(event) => updateDigit(index, event.target.value)}
                    onKeyDown={(event) => onOtpKeyDown(index, event)}
                    onPaste={onOtpPaste}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={OTP_LENGTH}
                    aria-label={`Dígito ${index + 1}`}
                    disabled={loading}
                  />
                ))}
              </div>
              <p id={hintId} style={{ ...hintStyle, textAlign: "center" }}>
                {resendIn > 0 ? (
                  <>Reenviar código en {formatCountdown(resendIn)}</>
                ) : (
                  <button type="button" className="entrar-control" onClick={() => void resendCode()} style={linkButtonStyle} disabled={loading}>
                    Reenviar código
                  </button>
                )}
              </p>
              {devHint ? (
                <p role="note" style={{ ...hintStyle, textAlign: "center" }}>
                  {devHint}
                </p>
              ) : null}
              {error ? (
                <p id={errorId} role="alert" style={{ ...errorStyle, textAlign: "center" }}>
                  {error}
                </p>
              ) : null}
              <button className="entrar-control" type="submit" style={{ ...primaryButtonStyle, marginTop: spaceTokens[4] }} disabled={loading || code.length < OTP_LENGTH}>
                {loading ? "Espera…" : "Verificar"}
              </button>
            </>
          ) : null}

          {step === "name" ? (
            <>
              <h1 style={titleStyle}>¿Cómo te llamas?</h1>
              <p style={subtitleStyle}>Primera vez: completa tu nombre para crear la cuenta.</p>
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
              {error ? (
                <p id={errorId} role="alert" style={errorStyle}>
                  {error}
                </p>
              ) : null}
              <button className="entrar-control" type="submit" style={primaryButtonStyle} disabled={loading}>
                {loading ? "Espera…" : "Crear cuenta"}
              </button>
            </>
          ) : null}
        </form>
      )}
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.1 4 9.3 8.5 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.2 39.4 16 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 3.7-4.5 6.5-8.3 7.6l.1.1 6.2 5.2C35.1 42.4 44 36 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="20" height="22" viewBox="0 0 24 28" aria-hidden="true">
      <path
        fill="#111"
        d="M19.7 14.6c0-3.2 2.6-4.7 2.7-4.8-1.5-2.2-3.8-2.5-4.6-2.5-2-0.2-3.8 1.2-4.8 1.2s-2.5-1.1-4.1-1.1c-2.1 0-4.1 1.2-5.2 3.1-2.2 3.9-.6 9.6 1.6 12.7 1.1 1.6 2.3 3.3 4 3.2 1.6-.1 2.2-1 4.1-1s2.5 1 4.2.9c1.7-.1 2.8-1.6 3.9-3.1 1.2-1.8 1.7-3.5 1.8-3.6-.1 0-3.3-1.3-3.6-5zM15.6 4.8c.9-1.1 1.5-2.5 1.3-4-1.3.1-2.8.9-3.7 1.9-.8.9-1.5 2.4-1.3 3.8 1.4.1 2.8-.7 3.7-1.7z"
      />
    </svg>
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

const pageStyle = {
  background: colors.surface,
  color: colors.text,
  fontFamily: fontTokens.family,
  fontSize: fontTokens.sizes.body,
  lineHeight: `${fontTokens.lineHeight.body}px`,
  margin: "0 auto",
  maxWidth: 430,
  minHeight: "100dvh",
  padding: `${spaceTokens[4]}px ${spaceTokens[4]}px ${spaceTokens[8]}px`,
} as const;

const headerStyle = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  marginBottom: spaceTokens[6],
  minHeight: 44,
} as const;

const backButtonStyle = {
  alignItems: "center",
  background: "none",
  border: "none",
  color: colors.primary,
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 34,
  fontWeight: 300,
  height: 44,
  justifyContent: "center",
  lineHeight: 1,
  padding: 0,
  width: 36,
} as const;

const brandRowStyle = {
  alignItems: "center",
  display: "flex",
  gap: spaceTokens[2],
  justifyContent: "center",
} as const;

const titleStyle = {
  color: colors.deep,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  lineHeight: 1.2,
  margin: `0 0 ${spaceTokens[6]}px`,
  textAlign: "center" as const,
};

const subtitleStyle = {
  color: colors.primary,
  fontSize: fontTokens.sizes.body,
  lineHeight: `${fontTokens.lineHeight.body}px`,
  margin: `0 0 ${spaceTokens[6]}px`,
  textAlign: "center" as const,
};

const tabsStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  marginBottom: spaceTokens[6],
} as const;

function tabStyle(active: boolean) {
  return {
    background: "none",
    border: "none",
    borderBottom: active ? `3px solid ${colors.primary}` : `3px solid ${colors.border}`,
    color: active ? colors.deep : colors.muted,
    cursor: "pointer",
    font: "inherit",
    fontWeight: active ? 700 : 500,
    minHeight: 44,
    padding: `0 0 ${spaceTokens[2]}px`,
  } as const;
}

const phoneRowStyle = {
  display: "flex",
  gap: spaceTokens[2],
  marginBottom: spaceTokens[4],
} as const;

const labelStyle = { display: "grid", gap: spaceTokens[2], marginBottom: spaceTokens[4] } as const;

const inputStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  color: colors.text,
  font: "inherit",
  minHeight: 52,
  padding: `0 ${spaceTokens[3]}px`,
  width: "100%",
} as const;

const otpRowStyle = {
  display: "grid",
  gap: spaceTokens[2],
  gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))`,
  marginBottom: spaceTokens[4],
} as const;

const otpBoxStyle = {
  background: colors.surface,
  border: `1.5px solid ${colors.primary}`,
  borderRadius: radiusTokens.md,
  color: colors.deep,
  font: "inherit",
  fontSize: 24,
  fontWeight: 700,
  minHeight: 56,
  textAlign: "center" as const,
  width: "100%",
};

const primaryButtonStyle = {
  background: colors.primary,
  border: "none",
  borderRadius: 999,
  color: colors.primaryOn,
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
  minHeight: 54,
  padding: `0 ${spaceTokens[4]}px`,
  width: "100%",
} as const;

const secondaryButtonStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  color: colors.text,
  cursor: "pointer",
  font: "inherit",
  minHeight: 44,
  marginTop: spaceTokens[3],
  padding: `0 ${spaceTokens[4]}px`,
} as const;

const dividerStyle = {
  alignItems: "center",
  display: "flex",
  gap: spaceTokens[3],
  margin: `${spaceTokens[6]}px 0 ${spaceTokens[4]}px`,
} as const;

const dividerLineStyle = {
  background: colors.border,
  flex: 1,
  height: 1,
} as const;

const dividerTextStyle = {
  color: colors.muted,
  fontSize: fontTokens.sizes.caption,
  whiteSpace: "nowrap" as const,
};

const socialRowStyle = {
  display: "grid",
  gap: spaceTokens[3],
  gridTemplateColumns: "1fr 1fr",
  marginBottom: spaceTokens[4],
} as const;

const socialButtonStyle = {
  alignItems: "center",
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  color: colors.deep,
  cursor: "pointer",
  display: "grid",
  font: "inherit",
  fontWeight: 600,
  gap: spaceTokens[2],
  justifyItems: "center",
  minHeight: 72,
  padding: spaceTokens[3],
} as const;

const legalStyle = {
  color: colors.muted,
  fontSize: fontTokens.sizes.caption,
  lineHeight: `${fontTokens.lineHeight.caption}px`,
  margin: `${spaceTokens[6]}px 0 0`,
  textAlign: "center" as const,
};

const legalLinkStyle = {
  color: colors.primary,
  fontWeight: 600,
  textDecoration: "none",
} as const;

const linkButtonStyle = {
  background: "none",
  border: "none",
  color: colors.primary,
  cursor: "pointer",
  font: "inherit",
  fontWeight: 600,
  padding: 0,
} as const;

const hintStyle = {
  color: colors.muted,
  fontSize: fontTokens.sizes.caption,
  lineHeight: `${fontTokens.lineHeight.caption}px`,
  margin: `${spaceTokens[2]}px 0 0`,
} as const;

const mutedStyle = { color: colors.muted, margin: 0 } as const;
const errorStyle = { color: colors.error, margin: `${spaceTokens[3]}px 0` } as const;
const successStyle = { color: colors.success, margin: `0 0 ${spaceTokens[4]}px` } as const;
