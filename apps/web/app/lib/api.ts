/**
 * Base URL of the Nest API.
 * - Local web: default http://127.0.0.1:3001
 * - Railway / staging: set NEXT_PUBLIC_API_URL to the public API origin (no trailing slash)
 *
 * Mobile Expo uses EXPO_PUBLIC_API_URL (see apps/mobile/src/api.ts).
 * Physical devices cannot use localhost; use the LAN IP or the Railway URL.
 */
export const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";
export const ONBOARDING_KEY = "comprausa.onboarding.seen";

/** Viewport estrecho: la entrada es splash + Comenzar / Iniciar sesión → /entrar. */
export const MOBILE_MAX_WIDTH_PX = 767;
