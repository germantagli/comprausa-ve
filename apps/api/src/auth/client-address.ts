/**
 * Socket address only. X-Forwarded-For is ignored; the process does not trust a proxy header.
 */
export function clientAddress(request: { ip?: string | null }): string {
  if (typeof request.ip === "string" && request.ip.length > 0) {
    return request.ip;
  }
  return "unknown";
}
