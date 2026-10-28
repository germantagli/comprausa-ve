/**
 * Base URL of the Nest API for Expo.
 *
 * Set EXPO_PUBLIC_API_URL (no trailing slash), for example:
 * - iOS Simulator → http://127.0.0.1:3001
 * - Android Emulator → http://10.0.2.2:3001 (host loopback)
 * - Physical device → http://<LAN-IP>:3001 or the Railway public URL
 * - Staging / production → https://comprausaapi-production.up.railway.app
 *
 * Do not ship a physical-device build that points at localhost.
 */
const fromEnv =
  typeof process !== "undefined" && typeof process.env?.EXPO_PUBLIC_API_URL === "string"
    ? process.env.EXPO_PUBLIC_API_URL.trim()
    : "";

export const apiBase = fromEnv.length > 0 ? fromEnv.replace(/\/$/, "") : "http://127.0.0.1:3001";
