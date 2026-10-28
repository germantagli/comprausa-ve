import type { AuthChannel } from "./destination";

export function parseOtpDestinationKey(key: string): { channel: AuthChannel; destination: string } | null {
  const separator = key.indexOf(":");
  if (separator <= 0 || separator === key.length - 1) {
    return null;
  }
  const channel = key.slice(0, separator);
  const destination = key.slice(separator + 1);
  if (channel !== "email" && channel !== "phone") {
    return null;
  }
  return { channel, destination };
}
