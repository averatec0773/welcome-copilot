import { NextResponse } from "next/server";
import { mapOpsInboxRows, readRange } from "@/lib/sheets";

export const dynamic = "force-dynamic";
const CACHE = { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" };

export async function GET() {
  try {
    const messages = mapOpsInboxRows(await readRange("OpsInbox!A1:D200"));
    return NextResponse.json({ messages }, { headers: CACHE });
  } catch (e) {
    // OpsInbox auto-creates lazily on the first real alert/digest — a fresh
    // sheet copy (or one that hasn't fired yet) has no tab at all, which the
    // Sheets API reports as an error. That's a normal, expected state here,
    // not an outage: report an empty inbox instead of a 502.
    console.error("opsinbox read failed (tab may not exist yet):", e);
    return NextResponse.json({ messages: [] }, { headers: CACHE });
  }
}
