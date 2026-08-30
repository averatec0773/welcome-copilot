import { NextResponse } from "next/server";
import { mapTrackerRows, readRange } from "@/lib/sheets";

export const dynamic = "force-dynamic";
const CACHE = { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" };

export async function GET() {
  try {
    // Row 5000 is well past what 7-day demo-row archiving (apps-script/monitoring.gs
    // archiveDemoRows_) plus normal hiring volume should ever reach.
    const hires = mapTrackerRows(await readRange("Tracker!A1:L5000"));
    return NextResponse.json({ hires }, { headers: CACHE });
  } catch (e) {
    console.error("tracker read failed:", e);
    return NextResponse.json({ error: "tracker_unavailable" }, { status: 502 });
  }
}
