import { NextResponse } from "next/server";
import { mapTrackerRows, readRange } from "@/lib/sheets";

export const dynamic = "force-dynamic";
const CACHE = { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" };

export async function GET() {
  try {
    const hires = mapTrackerRows(await readRange("Tracker!A1:L500"));
    return NextResponse.json({ hires }, { headers: CACHE });
  } catch (e) {
    console.error("tracker read failed:", e);
    return NextResponse.json({ error: "tracker_unavailable" }, { status: 502 });
  }
}
