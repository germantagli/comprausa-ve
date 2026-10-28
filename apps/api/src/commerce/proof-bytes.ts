export const MAX_PROOF_BYTES = 2_000_000;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Checks the declared type against the file header. Does not execute the bytes. */
export function inspectProof(contentType: string, bytes: Buffer): contentType is "image/jpeg" | "image/png" | "application/pdf" {
  if (bytes.length === 0 || bytes.length > MAX_PROOF_BYTES) {
    return false;
  }
  if (contentType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.length >= PNG.length && bytes.subarray(0, PNG.length).equals(PNG);
  }
  if (contentType === "application/pdf") {
    return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  return false;
}
