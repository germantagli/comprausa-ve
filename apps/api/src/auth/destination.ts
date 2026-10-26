export type AuthChannel = "email" | "phone";

export function normalizeDestination(channel: AuthChannel, destination: string): string {
  const trimmed = destination.trim();
  return channel === "email" ? trimmed.toLowerCase() : trimmed;
}

/** Key for the OTP store. This is the destination, never the one-time code. */
export function otpDestinationKey(channel: AuthChannel, destination: string): string {
  return `${channel}:${normalizeDestination(channel, destination)}`;
}
