import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, accessToken, hasAccess, verifyCode } from "@/lib/access";
import { getLimiters } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json({ unlocked: hasAccess(req.cookies.get(ACCESS_COOKIE)?.value) });
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const { perIp } = getLimiters();
  const rl = await perIp.limit(`unlock:${ip}`);
  if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let code = "";
  try {
    code = String((await req.json()).code ?? "");
  } catch {
    /* handled below */
  }
  if (!verifyCode(code)) return NextResponse.json({ error: "invalid_code" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, accessToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 3600,
    path: "/",
  });
  return res;
}
