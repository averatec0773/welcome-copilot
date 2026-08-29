import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, hasAccess } from "@/lib/access";
import { answerQuestion, SUGGESTED_QUESTIONS, type AskResponse } from "@/lib/claude";
import { getLimiters } from "@/lib/ratelimit";
import prebaked from "@/content/prebaked.json";

export const dynamic = "force-dynamic";

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
  const baked = PREBAKED[question];
  if (baked) return NextResponse.json({ ...baked, cached: true });

  // Free-form questions call Claude — they need the access code…
  if (!hasAccess(req.cookies.get(ACCESS_COOKIE)?.value)) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }

  // …and stay rate-limited as defense-in-depth even then.
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const { perIp, global: globalLimit } = getLimiters();

  const ipRes = await perIp.limit(ip);
  if (!ipRes.success) {
    return NextResponse.json({ error: "rate_limited", retryAfterSeconds: 60 }, { status: 429 });
  }

  const globalRes = await globalLimit.limit("all");
  if (!globalRes.success) {
    return NextResponse.json({ error: "daily_budget_exhausted" }, { status: 429 });
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
