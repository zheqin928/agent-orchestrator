/**
 * Single-user authentication.
 *
 * Enabled when env var `AO_AUTH_PASSWORD` is set. The signing key is derived
 * from SHA-256(password), so changing the password invalidates all sessions.
 *
 * Cookie format: `<base64url-payload>.<base64url-signature>` where payload is
 * `{"exp": <unix-seconds>}` and signature is HMAC-SHA256 of the payload.
 *
 * Uses Web Crypto API so it works in Next.js Edge middleware and Node alike.
 */

export const AUTH_COOKIE_NAME = "ao_auth";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function isAuthEnabled(): boolean {
  return typeof process !== "undefined" && Boolean(process.env.AO_AUTH_PASSWORD);
}

export function getAuthPassword(): string | null {
  return process.env.AO_AUTH_PASSWORD ?? null;
}

const encoder = new TextEncoder();

function base64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(padded);
  const out = new ArrayBuffer(bin.length);
  const view = new Uint8Array(out);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  return crypto.subtle.importKey("raw", hash, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function issueSessionCookieValue(password: string, now = Date.now()): Promise<string> {
  const payload = { exp: Math.floor(now / 1000) + SESSION_DURATION_SECONDS };
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const payloadB64 = base64urlEncode(payloadBytes);
  const key = await deriveKey(password);
  const sig = await crypto.subtle.sign("HMAC", key, payloadBytes);
  return `${payloadB64}.${base64urlEncode(new Uint8Array(sig))}`;
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
    const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(payloadBytes))) as {
      exp?: number;
    };
    if (typeof payload.exp !== "number") return false;
    if (payload.exp * 1000 < now) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildSessionCookie(value: string, secure: boolean): string {
  const parts = [
    `${AUTH_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DURATION_SECONDS}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearCookie(secure: boolean): string {
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
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
