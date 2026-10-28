import type { AuthenticatedSession } from "@comprausa/api-client";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "comprausa.session";
const ONBOARDING_KEY = "comprausa.onboarding.seen";
const DEVICE_KEY = "comprausa.device.id";

/** In-memory fallback when SecureStore is unavailable (e.g. some test hosts). */
let memorySession: AuthenticatedSession | null = null;
let memoryOnboarding = false;
let memoryDeviceId: string | null = null;

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

/** Stable device id for OTP challenges (mirrors web localStorage DEVICE_KEY). */
export async function readOrCreateDeviceId(): Promise<string> {
  if (memoryDeviceId) {
    return memoryDeviceId;
  }
  try {
    const existing = await SecureStore.getItemAsync(DEVICE_KEY);
    if (existing && existing.length > 0) {
      memoryDeviceId = existing;
      return existing;
    }
  } catch {
    // fall through
  }
  const created = createDeviceId();
  memoryDeviceId = created;
  try {
    await SecureStore.setItemAsync(DEVICE_KEY, created);
  } catch {
    // keep memory copy
  }
  return created;
}
