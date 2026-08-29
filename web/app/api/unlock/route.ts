import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, accessToken, hasAccess, verifyCode } from "@/lib/access";
import { clientIp, getLimiters } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json({ unlocked: hasAccess(req.cookies.get(ACCESS_COOKIE)?.value) });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  let rl;
  try {
    rl = await getLimiters().perIp.limit(`unlock:${ip}`);
  } catch (e) {
    console.error("rate limiter unavailable:", e);
    return NextResponse.json({ error: "limiter_unavailable" }, { status: 503 });
  }
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let g;
  try {
    g = await getLimiters().unlockGlobal.limit("all");
  } catch (e) {
    console.error("rate limiter unavailable:", e);
    return NextResponse.json({ error: "limiter_unavailable" }, { status: 503 });
  }
  if (!g.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "3600" } });
  }

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
