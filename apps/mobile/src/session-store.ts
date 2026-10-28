import type { AuthenticatedSession } from "@comprausa/api-client";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "comprausa.session";
const ONBOARDING_KEY = "comprausa.onboarding.seen";

/** In-memory fallback when SecureStore is unavailable (e.g. some test hosts). */
let memorySession: AuthenticatedSession | null = null;
let memoryOnboarding = false;

export async function readStoredSession(): Promise<AuthenticatedSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) {
      return memorySession;
    }
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
    return memorySession;
  }
  return memorySession;
}

export async function saveStoredSession(session: AuthenticatedSession): Promise<void> {
  memorySession = session;
  const payload = JSON.stringify({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresInSeconds: session.expiresInSeconds,
  });
  try {
    await SecureStore.setItemAsync(SESSION_KEY, payload);
  } catch {
    // Keep memory copy.
  }
}

export async function clearStoredSession(): Promise<void> {
  memorySession = null;
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function readOnboardingCompleted(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
    if (value === "1") {
      return true;
    }
  } catch {
    // fall through
  }
  return memoryOnboarding;
}

export async function markOnboardingCompleted(): Promise<void> {
  memoryOnboarding = true;
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "1");
  } catch {
    // keep memory
  }
}

export async function resetOnboardingCompleted(): Promise<void> {
  memoryOnboarding = false;
  try {
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
  } catch {
    // ignore
  }
}
