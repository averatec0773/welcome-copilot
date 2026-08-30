import { NextResponse } from "next/server";
import { mapTrackerRows, readRange } from "@/lib/sheets";

export const dynamic = "force-dynamic";
const CACHE = { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" };

export async function GET() {
  try {
    // Row 5000 is well past what 7-day demo-row archiving (apps-script/monitoring.gs
    // archiveDemoRows_) plus normal hiring volume should ever reach. Columns
    // extend through P (applied_on/interviewed_on/offer_on/notes).
    const hires = mapTrackerRows(await readRange("Tracker!A1:P5000"));
    return NextResponse.json({ hires }, { headers: CACHE });
  } catch (e) {
    console.error("tracker read failed:", e);
    return NextResponse.json({ error: "tracker_unavailable" }, { status: 502 });
  }
}
