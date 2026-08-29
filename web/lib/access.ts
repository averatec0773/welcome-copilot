import { createHmac, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE = "wc_access";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function accessToken(): string {
  const code = process.env.DEMO_ACCESS_CODE ?? "";
  return createHmac("sha256", code).update("welcome-copilot-unlock-v1").digest("hex");
}

export function verifyCode(code: string): boolean {
  const expected = process.env.DEMO_ACCESS_CODE ?? "";
  return Boolean(expected) && Boolean(code) && safeEqual(code, expected);
}

export function hasAccess(cookieValue: string | undefined): boolean {
  if (!cookieValue || !process.env.DEMO_ACCESS_CODE) return false;
  return safeEqual(cookieValue, accessToken());
}
