import { appleWebClientId, googleWebClientId } from "./oauth-clients";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (listener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          cancel: () => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization?: { id_token?: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

function loadScript(src: string, id: string): Promise<void> {
  const existing = document.getElementById(id);
  if (existing) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export async function requestGoogleIdToken(): Promise<string> {
  if (!googleWebClientId) {
    throw new Error("google_not_configured");
  }
  await loadScript("https://accounts.google.com/gsi/client", "google-gsi");
  if (!window.google?.accounts?.id) {
    throw new Error("google_sdk_missing");
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.google?.accounts.id.cancel();
      reject(new Error("google_cancelled"));
    }, 120_000);
    window.google!.accounts.id.initialize({
      client_id: googleWebClientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        window.clearTimeout(timeout);
        if (response.credential) {
          resolve(response.credential);
          return;
        }
        reject(new Error("google_cancelled"));
      },
    });
    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        window.clearTimeout(timeout);
        reject(new Error("google_cancelled"));
      }
    });
  });
}

export async function requestAppleIdToken(): Promise<{
  idToken: string;
  givenName?: string;
  familyName?: string;
}> {
  if (!appleWebClientId) {
    throw new Error("apple_not_configured");
  }
  await loadScript(
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
    "apple-auth",
  );
  if (!window.AppleID?.auth) {
    throw new Error("apple_sdk_missing");
  }
  window.AppleID.auth.init({
    clientId: appleWebClientId,
    scope: "name email",
    redirectURI: window.location.origin,
    usePopup: true,
  });
  const result = await window.AppleID.auth.signIn();
  const idToken = result.authorization?.id_token;
  if (!idToken) {
    throw new Error("apple_cancelled");
  }
  return {
    idToken,
    givenName: result.user?.name?.firstName,
    familyName: result.user?.name?.lastName,
  };
}
