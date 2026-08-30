import { describe, expect, it } from "vitest";
import {
  buildSimulateRow, countPendingDemoRows, isQuotaLow, isValidEmail,
  LICENSES, STATES, MANAGER, FIRST_NAMES,
} from "@/lib/simulate";
import type { Hire } from "@/lib/sheets";

describe("sanitizeFirstName (via buildSimulateRow)", () => {
  it("keeps a valid first name as-is", () => {
    const { name } = buildSimulateRow("Riley");
    expect(name).toBe("Riley");
  });

  it("falls back to a random preset name for empty/missing input", () => {
    const { name } = buildSimulateRow(undefined);
    expect(FIRST_NAMES).toContain(name);
  });

  it("falls back to a random preset name for input with digits, symbols, or spaces", () => {
    for (const bad of ["Ri1ey", "Ri ley", "Riley!", "a".repeat(21)]) {
      const { name } = buildSimulateRow(bad);
      expect(FIRST_NAMES).toContain(name);
    }
  });

  it("accepts a 20-character all-letter name and rejects a 21-character one", () => {
    const ok = "a".repeat(20);
    expect(buildSimulateRow(ok).name).toBe(ok);
  });
});

describe("buildSimulateRow", () => {
  it("builds a 16-column row with the expected shape and fixed fields", () => {
    const { row, alias } = buildSimulateRow("Sam");
    expect(row).toHaveLength(16);
    const [
      hireId, name, email, license, state, startDate, manager, status, sentAt,
      welcomeStatus, errorDetail, isDemo, appliedOn, interviewedOn, offerOn, notes,
    ] = row;
    expect(hireId).toBe("");
    expect(name).toBe("Sam");
    expect(email).toBe(alias);
    expect(LICENSES).toContain(license);
    expect(STATES).toContain(state);
    expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(manager).toBe(MANAGER);
    expect(status).toBe("Hired");
    expect(sentAt).toBe("");
    expect(welcomeStatus).toBe("");
    expect(errorDetail).toBe("");
    expect(isDemo).toBe(true);
    expect(appliedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(interviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(offerOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(notes).toBe("Created by a demo visitor via Simulate");
  });

  it("sets start_date to 14 days from today, in ISO YYYY-MM-DD", () => {
    const { row } = buildSimulateRow("Sam");
    const expected = new Date();
    expected.setDate(expected.getDate() + 14);
    const y = expected.getFullYear();
    const m = String(expected.getMonth() + 1).padStart(2, "0");
    const d = String(expected.getDate()).padStart(2, "0");
    expect(row[5]).toBe(`${y}-${m}-${d}`);
  });

  it("sets applied_on/interviewed_on/offer_on to 30/14/7 days before today, in ISO YYYY-MM-DD", () => {
    const { row } = buildSimulateRow("Sam");
    const iso = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    expect(row[12]).toBe(iso(-30));
    expect(row[13]).toBe(iso(-14));
    expect(row[14]).toBe(iso(-7));
  });

  it("generates a unique gmail + alias for each call", () => {
    const a = buildSimulateRow("Sam").alias;
    const b = buildSimulateRow("Sam").alias;
    expect(a).toMatch(/^ayetek0773\+demo-[0-9a-f]{6}@gmail\.com$/);
    expect(b).toMatch(/^ayetek0773\+demo-[0-9a-f]{6}@gmail\.com$/);
    expect(a).not.toBe(b);
  });
});

describe("isValidEmail", () => {
  it("accepts a plausible email", () => {
    expect(isValidEmail("someone@example.com")).toBe(true);
  });
  it("rejects missing/malformed/oversized input", () => {
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing-domain@")).toBe(false);
    expect(isValidEmail("a@b.com".padStart(255, "a"))).toBe(false);
  });
});

function hire(overrides: Partial<Hire>): Hire {
  return {
    hireId: "H-0001", name: "Demo X", email: "a@b.com", license: "LMFT", state: "CA",
    startDate: "1/1/2027", manager: "Luis Herrera", status: "Hired", welcomeSentAt: "",
    welcomeStatus: "", errorDetail: "", isDemo: false,
    appliedOn: "", interviewedOn: "", offerOn: "", notes: "", ...overrides,
  };
}

describe("countPendingDemoRows", () => {
  it("counts only demo rows without a welcome_sent_at", () => {
    const hires = [
      hire({ isDemo: true, welcomeSentAt: "" }),
      hire({ isDemo: true, welcomeSentAt: "8/1/2026" }),
      hire({ isDemo: false, welcomeSentAt: "" }),
      hire({ isDemo: true, welcomeSentAt: "" }),
    ];
    expect(countPendingDemoRows(hires)).toBe(2);
  });

  it("excludes terminal rows (INVALID, DUPLICATE) — they'll never send or clear on their own", () => {
    const hires = [
      hire({ isDemo: true, welcomeSentAt: "", welcomeStatus: "INVALID" }),
      hire({ isDemo: true, welcomeSentAt: "", welcomeStatus: "DUPLICATE" }),
      hire({ isDemo: true, welcomeSentAt: "", welcomeStatus: "" }),
      hire({ isDemo: true, welcomeSentAt: "", welcomeStatus: "SENDING" }),
    ];
    expect(countPendingDemoRows(hires)).toBe(2);
  });
});

describe("isQuotaLow", () => {
  it("flags quota under the floor", () => {
    expect(isQuotaLow({ mail_quota_remaining: "5" })).toBe(true);
  });
  it("does not flag quota at or above the floor", () => {
    expect(isQuotaLow({ mail_quota_remaining: "20" })).toBe(false);
    expect(isQuotaLow({ mail_quota_remaining: "100" })).toBe(false);
  });
  it("does not block when the config value is missing or unparseable", () => {
    expect(isQuotaLow({})).toBe(false);
    expect(isQuotaLow({ mail_quota_remaining: "" })).toBe(false);
    expect(isQuotaLow({ mail_quota_remaining: "not-a-number" })).toBe(false);
  });
});
