import { NextResponse } from "next/server";
import { mapConfig, mapLogRows, readRange } from "@/lib/sheets";

export const dynamic = "force-dynamic";
const CACHE = { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" };

export async function GET() {
  try {
    const [configValues, logValues] = await Promise.all([
      readRange("Config!A1:B20"),
      readRange("Log!A1:E2000"),
    ]);
    const cfg = mapConfig(configValues);
    const logs = mapLogRows(logValues).slice(-20).reverse();
    return NextResponse.json(
      {
        lastRunAt: cfg.last_run_at ?? "",
        mailQuotaRemaining: cfg.mail_quota_remaining ?? "",
        dryRun: (cfg.dry_run ?? "").toUpperCase() !== "FALSE",
        badgeUrl: process.env.HEALTHCHECKS_BADGE_URL ?? "",
        logs,
      },
      { headers: CACHE },
    );
  } catch (e) {
    console.error("health read failed:", e);
    return NextResponse.json({ error: "health_unavailable" }, { status: 502 });
  }
}
