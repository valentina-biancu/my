import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "heartfirst_prevent_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const LOCAL_CODE = process.env.PREVENT_LOCAL_ACCESS_CODE ?? "PREVENT-LOCAL";
const LOCAL_SECRET =
  process.env.PREVENT_SESSION_SECRET ?? "prevent-local-development-secret-only";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function secret() {
  return isProduction() ? process.env.PREVENT_SESSION_SECRET ?? "" : LOCAL_SECRET;
}

export function authConfigured() {
  if (!isProduction()) return true;
  return Boolean(secret() && process.env.PREVENT_ACCESS_CODE_HASHES);
}

export function hashAccessCode(code: string) {
  return createHmac("sha256", secret())
    .update(code.trim().toUpperCase())
    .digest("hex");
}

export function verifyAccessCode(code: string) {
  if (!authConfigured()) return false;
  if (!isProduction()) {
    const candidate = Buffer.from(code.trim().toUpperCase());
    const expected = Buffer.from(LOCAL_CODE.trim().toUpperCase());
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }
  const candidate = hashAccessCode(code);
  return (process.env.PREVENT_ACCESS_CODE_HASHES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .some((expected) => {
      const a = Buffer.from(candidate);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    });
}

export function makeSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `prevent:${expiresAt}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return { value: `${payload}.${signature}` };
}

export function verifySession(value: string | undefined) {
  if (!value || !authConfigured()) return false;
  const lastDot = value.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  const [product, expiresRaw] = payload.split(":");
  if (product !== "prevent" || !expiresRaw || Number(expiresRaw) <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
