import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, hasAccess } from "@/lib/access";
import { audit } from "@/lib/audit";
import { clientIp, getLimiters } from "@/lib/ratelimit";
import { appendTrackerRow, mapConfig, mapTrackerRows, readRange } from "@/lib/sheets";
import { buildSimulateRow, countPendingDemoRows, isQuotaLow, isValidEmail } from "@/lib/simulate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SHEET_ID = "138TahrgW_LzR5h1nIHXqdPtQNxi8jOeQcPeiQdOdO6w";

const SIM_IP_LIMIT = 10;
const SIM_GLOBAL_LIMIT = 3;

// Live quota check — reads remaining tokens without consuming any, so the
// console can show testers what they have left instead of letting them
// discover the limit by hitting a 429.
export async function GET(req: NextRequest) {
  const unlocked = hasAccess(req.cookies.get(ACCESS_COOKIE)?.value);
  const ip = clientIp(req);

  let ipRemaining: number | null = null;
  let globalRemaining: number | null = null;
  // The installed @upstash/ratelimit (v2.0.8) resolves getRemaining() to
  // { remaining, reset, limit } — reset (ms epoch) lets the UI show a
  // countdown instead of just a bare "try later".
  let ipReset: number | null = null;
  let globalReset: number | null = null;
  try {
    const [ipRes, globalRes] = await Promise.all([
      getLimiters().simPerIp.getRemaining(ip),
      getLimiters().simGlobal.getRemaining("all"),
    ]);
    ipRemaining = ipRes.remaining;
    ipReset = ipRes.reset;
    globalRemaining = globalRes.remaining;
    globalReset = globalRes.reset;
  } catch (e) {
    console.error("rate limiter unavailable (GET status):", e);
  }

  return NextResponse.json({
    unlocked,
    ipRemaining,
    ipLimit: SIM_IP_LIMIT,
    ipReset,
    globalRemaining,
    globalLimit: SIM_GLOBAL_LIMIT,
    globalReset,
    windows: { ip: "1 hour", global: "10 minutes" },
  });
}

export async function POST(req: NextRequest) {
  let body: { firstName?: string; visitorEmail?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* an empty/missing body is fine — firstName just falls back to a random one */
  }

  // Gated behind the same access code as the assistant's free-form questions —
  // this writes a real row and triggers a real send, unlike everything else in the console.
  if (!hasAccess(req.cookies.get(ACCESS_COOKIE)?.value)) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }

  const ip = clientIp(req);

  let ipRes;
  try {
    ipRes = await getLimiters().simPerIp.limit(ip);
  } catch (e) {
    console.error("rate limiter unavailable:", e);
    return NextResponse.json({ error: "limiter_unavailable" }, { status: 503 });
  }
  if (!ipRes.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  let globalRes;
  try {
    globalRes = await getLimiters().simGlobal.limit("all");
  } catch (e) {
    console.error("rate limiter unavailable:", e);
    return NextResponse.json({ error: "limiter_unavailable" }, { status: 503 });
  }
  if (!globalRes.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  // Capacity guards — never let the demo pile up unreviewed rows, run while
  // the pipeline is rehearsing instead of sending, or run the real mailbox
  // out of its daily quota.
  try {
    // Row 5000 is well past what 7-day demo-row archiving (apps-script/monitoring.gs
    // archiveDemoRows_) plus normal hiring volume should ever reach — this just
    // keeps the cap from silently truncating a sheet that outgrows the old 500.
    const [trackerValues, configValues] = await Promise.all([
      readRange("Tracker!A1:L5000"),
      readRange("Config!A1:B20"),
    ]);
    if (countPendingDemoRows(mapTrackerRows(trackerValues)) >= 5) {
      return NextResponse.json({ error: "demo_backlog" }, { status: 503 });
    }
    const cfg = mapConfig(configValues);
    // Fail closed like the pipeline itself: anything other than exactly "FALSE"
    // means dry-run, so simulate would just create an invisible Gmail draft.
    if ((cfg.dry_run ?? "").toUpperCase() !== "FALSE") {
      return NextResponse.json({ error: "dry_run_mode" }, { status: 503 });
    }
    if (isQuotaLow(cfg)) {
      return NextResponse.json({ error: "quota_low" }, { status: 503 });
    }
  } catch (e) {
    console.error("simulate guard read failed:", e);
    return NextResponse.json({ error: "sheet_unavailable" }, { status: 502 });
  }

  const visitorEmail = isValidEmail(body.visitorEmail) ? String(body.visitorEmail).trim() : undefined;
  const { row, name, alias } = buildSimulateRow(body.firstName);

  let appendedRow: number;
  try {
    appendedRow = await appendTrackerRow(row);
  } catch (e) {
    console.error("simulate append failed:", e);
    return NextResponse.json({ error: "append_failed" }, { status: 502 });
  }

  // Best-effort nudge — the 5-minute Apps Script trigger picks this row up
  // regardless, so a failed poke never blocks the response. The webhook runs
  // the whole pipeline synchronously before responding, so give it real
  // headroom — 10s could time out on a normal run and misreport poked:false.
  let poked = false;
  const webhookUrl = process.env.GAS_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: process.env.SIMULATE_TOKEN ?? "", alias, visitorEmail }),
        signal: AbortSignal.timeout(25000),
      });
      if (res.ok) {
        const j = await res.json().catch(() => null);
        poked = j?.ok === true;
      }
    } catch (e) {
      console.error("webhook poke failed:", e);
    }
  }

  const sheetLink = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0&range=A${appendedRow}`;

  const visitorEmailDomain = visitorEmail?.includes("@") ? visitorEmail.split("@")[1] : "";
  audit("simulate", req, { name, alias, visitorEmailDomain });

  return NextResponse.json({ alias, name, row: appendedRow, sheetLink, poked });
}
