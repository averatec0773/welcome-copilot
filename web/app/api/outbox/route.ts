import { NextResponse } from "next/server";
import { mapOutboxRows, readRange } from "@/lib/sheets";

export const dynamic = "force-dynamic";
const CACHE = { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" };

export async function GET() {
  try {
    const emails = mapOutboxRows(await readRange("Outbox!A1:F5000"));
    return NextResponse.json({ emails }, { headers: CACHE });
  } catch (e) {
    console.error("outbox read failed:", e);
    return NextResponse.json({ error: "outbox_unavailable" }, { status: 502 });
  }
}
