/**
 * Credential storage for connected sources.
 *
 * Tokens belonging to a person are never readable in the database: they are
 * sealed with AES-256-GCM before they are written and only ever opened inside a
 * server handler. The key is provisioned as HEALTH_TOKEN_SECRET.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env["HEALTH_TOKEN_SECRET"];
  if (!raw) throw new Error("HEALTH_TOKEN_SECRET is not set");
  // The secret is a random printable string; hash it to exactly 32 bytes.
  return createHash("sha256").update(raw).digest();
}

export function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function open<T>(stored: string | null): T | null {
  if (!stored) return null;
  try {
    const buf = Buffer.from(stored, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const out = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
    return JSON.parse(out.toString("utf8")) as T;
  } catch {
    return null;
  }
}
