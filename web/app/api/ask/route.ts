import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, hasAccess } from "@/lib/access";
import { answerQuestion, SUGGESTED_QUESTIONS, type AskResponse } from "@/lib/claude";
import { clientIp, getLimiters } from "@/lib/ratelimit";
import prebaked from "@/content/prebaked.json";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PREBAKED = prebaked as Record<string, AskResponse>;

export async function POST(req: NextRequest) {
  let question = "";
  try {
    const body = await req.json();
    question = String(body.question ?? "").trim().slice(0, 300);
  } catch {
    /* fall through to the empty-question check */
  }
  if (!question) return NextResponse.json({ error: "empty_question" }, { status: 400 });

  // Suggested questions are open to everyone and cost nothing: cached answers.
  // Only serve from the prebaked table for the exact suggested strings — an
  // arbitrary question that happens to collide with a JSON prototype key
  // (e.g. "constructor") must never short-circuit into a bogus cache hit.
  const baked = SUGGESTED_QUESTIONS.includes(question) ? PREBAKED[question] : undefined;
  if (baked) return NextResponse.json({ ...baked, cached: true });

  // Free-form questions call Claude — they need the access code…
  if (!hasAccess(req.cookies.get(ACCESS_COOKIE)?.value)) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }

  // …and stay rate-limited as defense-in-depth even then.
  const ip = clientIp(req);

  let ipRes;
  try {
    ipRes = await getLimiters().perIp.limit(ip);
  } catch (e) {
    console.error("rate limiter unavailable:", e);
    return NextResponse.json({ error: "limiter_unavailable" }, { status: 503 });
  }
  if (!ipRes.success) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: 60 },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let globalRes;
  try {
    globalRes = await getLimiters().global.limit("all");
  } catch (e) {
    console.error("rate limiter unavailable:", e);
    return NextResponse.json({ error: "limiter_unavailable" }, { status: 503 });
  }
  if (!globalRes.success) {
    return NextResponse.json(
      { error: "daily_budget_exhausted" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  try {
    return NextResponse.json(await answerQuestion(question));
  } catch (e) {
    console.error("ask failed:", e);
    return NextResponse.json({ error: "assistant_unavailable" }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ suggested: SUGGESTED_QUESTIONS });
}
