import { describe, expect, it } from "vitest";
import {
  buildSimulateRow, countPendingDemoRows, isQuotaLow, isValidEmail,
  LICENSES, STATES, MANAGER, FIRST_NAMES,
} from "@/lib/simulate";
import type { Hire } from "@/lib/sheets";

describe("sanitizeFirstName (via buildSimulateRow)", () => {
  it("keeps a valid first name as-is", () => {
    const { name } = buildSimulateRow("Riley");
    expect(name).toBe("Demo Riley");
  });

  it("falls back to a random preset name for empty/missing input", () => {
    const { name } = buildSimulateRow(undefined);
    const first = name.replace(/^Demo /, "");
    expect(FIRST_NAMES).toContain(first);
  });

  it("falls back to a random preset name for input with digits, symbols, or spaces", () => {
    for (const bad of ["Ri1ey", "Ri ley", "Riley!", "a".repeat(21)]) {
      const { name } = buildSimulateRow(bad);
      const first = name.replace(/^Demo /, "");
      expect(FIRST_NAMES).toContain(first);
    }
  });

  it("accepts a 20-character all-letter name and rejects a 21-character one", () => {
    const ok = "a".repeat(20);
    expect(buildSimulateRow(ok).name).toBe(`Demo ${ok}`);
  });
});

describe("buildSimulateRow", () => {
  it("builds a 12-column row with the expected shape and fixed fields", () => {
    const { row, alias } = buildSimulateRow("Sam");
    expect(row).toHaveLength(12);
    const [hireId, name, email, license, state, startDate, manager, status, sentAt, welcomeStatus, errorDetail, isDemo] = row;
    expect(hireId).toBe("");
    expect(name).toBe("Demo Sam");
    expect(email).toBe(alias);
    expect(LICENSES).toContain(license);
    expect(STATES).toContain(state);
    expect(startDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    expect(manager).toBe(MANAGER);
    expect(status).toBe("Hired");
    expect(sentAt).toBe("");
    expect(welcomeStatus).toBe("");
    expect(errorDetail).toBe("");
    expect(isDemo).toBe(true);
  });

  it("sets start_date to 14 days from today", () => {
    const { row } = buildSimulateRow("Sam");
    const expected = new Date();
    expected.setDate(expected.getDate() + 14);
    const expectedStr = `${expected.getMonth() + 1}/${expected.getDate()}/${expected.getFullYear()}`;
    expect(row[5]).toBe(expectedStr);
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
    welcomeStatus: "", errorDetail: "", isDemo: false, ...overrides,
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
