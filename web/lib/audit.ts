import { after } from "next/server";
import type { NextRequest } from "next/server";
import { google } from "googleapis";
import { clientIp } from "@/lib/ratelimit";
import { credentials } from "@/lib/sheets";

const AUDIT_SHEET_ID = process.env.AUDIT_SHEET_ID ?? "";

// Drops the last IPv4 octet ("1.2.3.x") or everything past the first three
// IPv6 groups ("2001:db8:85a3::x") — enough to see a fleet of requests
// without keeping any single visitor's full address.
export function truncateIp(ip: string): string {
  const v4 = /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/.exec(ip);
  if (v4) return `${v4[1]}.x`;
  const groups = ip.split(":");
  if (groups.length >= 3) return `${groups.slice(0, 3).join(":")}::x`;
  return "unknown";
}

// Write path — separate write-scoped client so the read-only path in
// lib/sheets.ts never needs the broader scope. Kept here (not exported from
// lib/sheets.ts) since only audit logging needs it.
async function appendAuditRow(values: string[]): Promise<void> {
  const auth = new google.auth.GoogleAuth({
    credentials: credentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: AUDIT_SHEET_ID,
    range: "Audit!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

// Fire-and-forget private audit log — never adds latency or failure to the
// request path it's called from. No-ops if AUDIT_SHEET_ID isn't configured;
// swallows any error from the append itself (console.error only, no details
// echoed). Never surfaced in any UI.
export function audit(event: string, req: NextRequest, details: Record<string, string>): void {
  if (!AUDIT_SHEET_ID) return;
  after(async () => {
    try {
      const ip = truncateIp(clientIp(req));
      const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);
      const detailsJson = JSON.stringify(details).slice(0, 2000);
      await appendAuditRow([new Date().toISOString(), event, ip, ua, detailsJson]);
    } catch (e) {
      console.error("audit append failed:", e);
    }
  });
}
