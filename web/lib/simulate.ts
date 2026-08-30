// Pure helpers for "Simulate a hire" — kept separate from the route so they're
// testable without mocking Sheets/Redis/fetch.
import type { Hire } from "./sheets";

export const LICENSES = ["LMFT", "LCSW", "LPC", "LPCC"] as const;
export const STATES = ["CA", "NY", "TX", "WA", "IL", "CO"] as const;
export const FIRST_NAMES = ["Alex", "Sam", "Jordan", "Riley", "Casey", "Morgan"] as const;
export const MANAGER = "Luis Herrera";
export const DEMO_BACKLOG_LIMIT = 5;
export const QUOTA_FLOOR = 20;

// Same basic shape as apps-script/validation.gs's EMAIL_RE — kept in sync deliberately.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// The greeting takes whatever the visitor calls themselves — Éloïse, José,
// 陈, O'Brien — so there is deliberately no character allow-list to fail.
// Only three system guards remain: first word only (the email greets the
// row's first word), a 20-character cap, and no leading formula trigger,
// because the sheet append uses USER_ENTERED and a name starting with "="
// would land in the public sheet as a live formula. HTML safety is the
// template's job (email.gs escapes the name), not this function's.
// Empty input gets a random preset name, as the form promises. Input that
// is nothing but formula/control characters returns null so the route can
// say so — never silently greet a stranger's name.
export function sanitizeFirstName(input: string | undefined | null): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return pick(FIRST_NAMES);
  const token = (trimmed.split(/\s+/)[0] ?? "")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/^[=+@]+/, "");
  const capped = Array.from(token).slice(0, 20).join("");
  return capped ? capped : null;
}

export function isValidEmail(input: string | undefined | null): boolean {
  const s = (input ?? "").trim();
  return s.length > 0 && s.length <= 254 && EMAIL_RE.test(s);
}

export function randomAliasHex(): string {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function buildAliasEmail(hex: string): string {
  return `ayetek0773+demo-${hex}@gmail.com`;
}

// ISO 'YYYY-MM-DD' — Sheets' USER_ENTERED input parses this as a date
// regardless of the spreadsheet's locale; 'M/D/YYYY' is locale-dependent and
// can silently land as text (or the wrong date) on a non-US-locale sheet.
function formatStartDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Same ISO formatting, offset from today by `days` (negative = past).
function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatStartDate(d);
}

export type SimulateRow = { row: (string | boolean)[]; name: string; alias: string };

// Builds the 16-column Tracker row (A..P) for a simulated hire. Takes an
// already-sanitized first name (see sanitizeFirstName — the route rejects
// null before calling this). hire_id (A), welcome_sent_at (I),
// welcome_status (J), and error_detail (K) start blank — the real pipeline
// owns those from here on. name (B) is just the first name — no "Demo "
// prefix — so the welcome email (which greets the row's first word) greets
// the chosen name correctly; demo rows stay identifiable via is_demo (L).
export function buildSimulateRow(firstName: string): SimulateRow {
  const alias = buildAliasEmail(randomAliasHex());
  const name = firstName;
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const row: (string | boolean)[] = [
    "", name, alias, pick(LICENSES), pick(STATES), formatStartDate(start),
    MANAGER, "Hired", "", "", "", true,
    isoDateOffset(-30), isoDateOffset(-14), isoDateOffset(-7),
    "Created by a demo visitor via Simulate",
  ];
  return { row, name, alias };
}

// Terminal rows (INVALID, DUPLICATE) are done — they'll never send and never
// clear on their own, so counting them toward the backlog would eventually
// lock the demo out permanently over a row nobody is going to fix.
export function countPendingDemoRows(hires: Hire[]): number {
  return hires.filter(
    (h) => h.isDemo && !h.welcomeSentAt && h.welcomeStatus !== "INVALID" && h.welcomeStatus !== "DUPLICATE",
  ).length;
}

export function isQuotaLow(config: Record<string, string>): boolean {
  const raw = config.mail_quota_remaining;
  if (raw === undefined || raw === "") return false;
  const n = Number(raw);
  return Number.isFinite(n) && n < QUOTA_FLOOR;
}
