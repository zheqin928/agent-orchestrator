/**
 * WebSocket-side mirror of src/lib/auth.ts.
 *
 * Kept in server/ because tsconfig.server.json restricts rootDir to ./server.
 * Must produce identical signatures to the Edge-runtime version so cookies
 * issued via the Next.js login route validate correctly on the WS upgrade.
 */

export const AUTH_COOKIE_NAME = "ao_auth";

export function getAuthPassword(): string | null {
  return process.env.AO_AUTH_PASSWORD ?? null;
}

const encoder = new TextEncoder();

function base64urlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  const out = new ArrayBuffer(buf.length);
  new Uint8Array(out).set(buf);
  return out;
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  return crypto.subtle.importKey("raw", hash, { name: "HMAC", hash: "SHA-256" }, false, [
    "verify",
  ]);
}

export async function verifySessionCookieValue(
  cookieValue: string | undefined | null,
  password: string,
  now = Date.now(),
): Promise<boolean> {
  if (!cookieValue) return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  try {
    const payloadBytes = base64urlDecode(payloadB64);
    const sigBytes = base64urlDecode(sigB64);
    const key = await deriveKey(password);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
    if (!valid) return false;
    const payload = JSON.parse(Buffer.from(payloadBytes).toString("utf8")) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    if (payload.exp * 1000 < now) return false;
    return true;
  } catch {
    return false;
  }
}

export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}
