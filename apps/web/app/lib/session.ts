import type { AuthenticatedSession } from "@comprausa/api-client";

export const SESSION_KEY = "comprausa.session";
export const DEVICE_KEY = "comprausa.deviceId";

export function readSession(): AuthenticatedSession | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuthenticatedSession>;
    if (typeof parsed.accessToken === "string" && typeof parsed.refreshToken === "string") {
      return {
        status: "authenticated",
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresInSeconds: typeof parsed.expiresInSeconds === "number" ? parsed.expiresInSeconds : 0,
      };
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
  return null;
}

export function saveSession(session: AuthenticatedSession): void {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresInSeconds: session.expiresInSeconds,
    }),
  );
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
