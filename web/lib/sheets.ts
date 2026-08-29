import fs from "node:fs";
import { google } from "googleapis";

const SHEET_ID = process.env.SHEET_ID ?? "";

export type Hire = {
  hireId: string; name: string; email: string; license: string; state: string;
  startDate: string; manager: string; status: string; welcomeSentAt: string;
  welcomeStatus: string; errorDetail: string; isDemo: boolean;
};

export type OutboxEmail = {
  hireId: string; to: string; subject: string; bodyHtml: string; mode: string; sentAt: string;
};

export type LogEntry = { timestamp: string; runId: string; hireId: string; action: string; result: string };

function credentials(): object {
  const b64 = process.env.GOOGLE_SA_KEY_B64;
  if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  const keyPath = process.env.GOOGLE_SA_KEY_PATH;
  if (keyPath) return JSON.parse(fs.readFileSync(keyPath, "utf8"));
  throw new Error("Set GOOGLE_SA_KEY_B64 (deploy) or GOOGLE_SA_KEY_PATH (local)");
}

export async function readRange(range: string): Promise<string[][]> {
  const auth = new google.auth.GoogleAuth({
    credentials: credentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  return (res.data.values ?? []) as string[][];
}

const cell = (r: string[], i: number) => String(r[i] ?? "");

export function mapTrackerRows(values: string[][]): Hire[] {
  return values
    .slice(1)
    .filter((r) => cell(r, 0) || cell(r, 1))
    .map((r) => ({
      hireId: cell(r, 0), name: cell(r, 1), email: cell(r, 2), license: cell(r, 3),
      state: cell(r, 4), startDate: cell(r, 5), manager: cell(r, 6), status: cell(r, 7),
      welcomeSentAt: cell(r, 8), welcomeStatus: cell(r, 9), errorDetail: cell(r, 10),
      isDemo: cell(r, 11).toUpperCase() === "TRUE",
    }));
}

export function mapOutboxRows(values: string[][]): OutboxEmail[] {
  return values
    .slice(1)
    .filter((r) => cell(r, 0))
    .map((r) => ({
      hireId: cell(r, 0), to: cell(r, 1), subject: cell(r, 2),
      bodyHtml: cell(r, 3), mode: cell(r, 4), sentAt: cell(r, 5),
    }))
    .reverse(); // append-only sheet → reverse = newest first
}

export function mapConfig(values: string[][]): Record<string, string> {
  const cfg: Record<string, string> = {};
  for (const r of values.slice(1)) if (cell(r, 0)) cfg[cell(r, 0)] = cell(r, 1);
  return cfg;
}

export function mapLogRows(values: string[][]): LogEntry[] {
  return values
    .slice(1)
    .filter((r) => cell(r, 0))
    .map((r) => ({
      timestamp: cell(r, 0), runId: cell(r, 1), hireId: cell(r, 2),
      action: cell(r, 3), result: cell(r, 4),
    }));
}
