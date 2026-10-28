import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const googleClientId = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
const appleClientId = (process.env.EXPO_PUBLIC_APPLE_CLIENT_ID ?? "").trim();

export function mobileOauthConfigured(): { google: boolean; apple: boolean } {
  return {
    google: googleClientId.length > 0,
    apple: appleClientId.length > 0 || Platform.OS === "ios",
  };
}

/** Hook for Google ID token via Expo AuthSession. */
export function useGoogleAuthRequest() {
  return Google.useIdTokenAuthRequest({
    clientId: googleClientId || "missing.apps.googleusercontent.com",
    iosClientId: googleClientId || undefined,
    androidClientId: googleClientId || undefined,
    webClientId: googleClientId || undefined,
  });
}

export async function requestAppleIdTokenNative(): Promise<{
  idToken: string;
  givenName?: string;
  familyName?: string;
}> {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error("apple_unavailable");
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error("apple_cancelled");
  }
  return {
    idToken: credential.identityToken,
    givenName: credential.fullName?.givenName ?? undefined,
    familyName: credential.fullName?.familyName ?? undefined,
  };
}

export { googleClientId, appleClientId };
