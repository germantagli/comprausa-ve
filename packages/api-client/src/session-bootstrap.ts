import { ApiClientError, refreshSession, type AuthenticatedSession } from "./auth";
import { getAccountProfile } from "./catalog";
import { getHealth } from "./health";

/**
 * Restores a stored session against the API.
 * - Valid access token → keep session.
 * - Expired access → try refresh.
 * - Offline / network error → keep stored session (do not wipe credentials).
 * - Auth rejected after refresh → null (caller must clear storage).
 */
export async function restoreAuthenticatedSession(
  baseUrl: string,
  stored: AuthenticatedSession | null,
  fetchImpl: typeof fetch = fetch,
): Promise<{ session: AuthenticatedSession | null; cleared: boolean }> {
  if (!stored) {
    return { session: null, cleared: false };
  }

  try {
    await getAccountProfile(baseUrl, stored.accessToken, fetchImpl);
    return { session: stored, cleared: false };
  } catch (caught) {
    if (!(caught instanceof ApiClientError)) {
      return { session: stored, cleared: false };
    }
    if (caught.status !== 401 && caught.status !== 403) {
      return { session: stored, cleared: false };
    }
  }

  try {
    const refreshed = await refreshSession(baseUrl, stored.refreshToken, fetchImpl);
    return { session: refreshed, cleared: false };
  } catch (caught) {
    if (!(caught instanceof ApiClientError)) {
      return { session: stored, cleared: false };
    }
    return { session: null, cleared: true };
  }
}

/** Soft reachability probe. Never throws; timed out or failed → false. */
export async function probeServerReachable(
  baseUrl: string,
  timeoutMs = 2500,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    return await Promise.race([
      getHealth(baseUrl, fetchImpl).then(() => true),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } catch {
    return false;
  }
}

export type EntryGate = "splash" | "onboarding" | "app";

/**
 * Pure routing after local + session restore.
 * Bienvenida (onboarding) solo con sesión válida y aún no vista —
 * nunca antes del registro / login.
 */
export function decideEntryGate(input: {
  requiresSplash: boolean;
  hasValidSession: boolean;
  onboardingCompleted: boolean;
}): EntryGate {
  if (!input.hasValidSession) {
    return input.requiresSplash ? "splash" : "app";
  }
  if (!input.onboardingCompleted) {
    return "onboarding";
  }
  return "app";
}
