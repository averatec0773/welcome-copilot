// Pure helpers for "Simulate a hire" — kept separate from the route so they're
// testable without mocking Sheets/Redis/fetch.
import type { Hire } from "./sheets";

export const LICENSES = ["LMFT", "LCSW", "LPC", "LPCC"] as const;
export const STATES = ["CA", "NY", "TX", "WA", "IL", "CO"] as const;
export const FIRST_NAMES = ["Alex", "Sam", "Jordan", "Riley", "Casey", "Morgan"] as const;
export const MANAGER = "Luis Herrera";
export const DEMO_BACKLOG_LIMIT = 5;
export const QUOTA_FLOOR = 20;

const FIRST_NAME_RE = /^[A-Za-z]{1,20}$/;
// Same basic shape as apps-script/validation.gs's EMAIL_RE — kept in sync deliberately.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function sanitizeFirstName(input: string | undefined | null): string {
  const trimmed = (input ?? "").trim();
  return FIRST_NAME_RE.test(trimmed) ? trimmed : pick(FIRST_NAMES);
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

function formatStartDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export type SimulateRow = { row: (string | boolean)[]; name: string; alias: string };

// Builds the 12-column Tracker row (A..L) for a simulated hire. hire_id (A),
// welcome_sent_at (I), welcome_status (J), and error_detail (K) start blank —
// the real pipeline owns those from here on.
export function buildSimulateRow(firstNameInput: string | undefined | null): SimulateRow {
  const firstName = sanitizeFirstName(firstNameInput);
  const alias = buildAliasEmail(randomAliasHex());
  const name = `Demo ${firstName}`;
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const row: (string | boolean)[] = [
    "", name, alias, pick(LICENSES), pick(STATES), formatStartDate(start),
    MANAGER, "Hired", "", "", "", true,
  ];
  return { row, name, alias };
}

export function countPendingDemoRows(hires: Hire[]): number {
  return hires.filter((h) => h.isDemo && !h.welcomeSentAt).length;
}

export function isQuotaLow(config: Record<string, string>): boolean {
  const raw = config.mail_quota_remaining;
  if (raw === undefined || raw === "") return false;
  const n = Number(raw);
  return Number.isFinite(n) && n < QUOTA_FLOOR;
}
