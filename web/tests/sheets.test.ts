import { describe, expect, it } from "vitest";
import { mapTrackerRows, mapOutboxRows, mapConfig } from "@/lib/sheets";

const TRACKER = [
  ["hire_id", "name", "email", "license", "state", "start_date", "manager", "status", "welcome_sent_at", "welcome_status", "error_detail", "is_demo", "applied_on", "interviewed_on", "offer_on", "notes"],
  ["H-0001", "Maria Chen", "a+maria@gmail.com", "LMFT", "CA", "8/3/2026", "Dana", "Onboarded", "7/20/2026", "SENT", "", "FALSE", "6/15/2026", "6/29/2026", "7/13/2026", "Referred by a current clinician"],
  ["H-0005", "Daniel Reyes", "daniel.reyes@", "PsyD", "FL", "9/14/2026", "Dana", "Hired", "", "INVALID", "invalid email format", "FALSE", "", "", "", ""],
  ["", "", "", "", "", "", "", "", "", "", "", ""],
  ["H-0011", "Short Row"],
];

describe("mapTrackerRows", () => {
  it("maps rows, skips blanks, pads short rows", () => {
    const hires = mapTrackerRows(TRACKER);
    expect(hires).toHaveLength(3);
    expect(hires[0]).toMatchObject({
      hireId: "H-0001", name: "Maria Chen", welcomeStatus: "SENT", isDemo: false,
      appliedOn: "6/15/2026", interviewedOn: "6/29/2026", offerOn: "7/13/2026",
      notes: "Referred by a current clinician",
    });
    expect(hires[1].errorDetail).toContain("invalid email");
    expect(hires[1].errorDetail).not.toContain("@"); // redacted — no address leaks into the log
    expect(hires[2]).toMatchObject({ hireId: "H-0011", email: "", isDemo: false, appliedOn: "", notes: "" });
  });
});

describe("mapOutboxRows", () => {
  it("sorts newest first by sent_at, regardless of sheet order", () => {
    const rows = [
      ["hire_id", "to", "subject", "body_html", "mode", "sent_at"],
      ["H-0001", "a+maria@gmail.com", "Welcome, Maria!", "<div>1</div>", "LIVE", "7/20/2026"],
      ["H-0003", "a+sarah@gmail.com", "Welcome, Sarah!", "<div>3</div>", "LIVE", "8/18/2026"],
      ["H-0002", "a+james@gmail.com", "Welcome, James!", "<div>2</div>", "LIVE", "7/27/2026"],
    ];
    const emails = mapOutboxRows(rows);
    expect(emails.map((e) => e.hireId)).toEqual(["H-0003", "H-0002", "H-0001"]);
  });
});

describe("mapConfig", () => {
  it("builds a key/value object, skipping the header", () => {
    const cfg = mapConfig([["key", "value"], ["dry_run", "TRUE"], ["last_run_at", "2026-08-29T20:24:47.383Z"]]);
    expect(cfg.dry_run).toBe("TRUE");
    expect(cfg.last_run_at).toContain("2026");
  });
});

describe("mapOpsInboxRows", () => {
  it("sorts newest first by parsed timestamp, index tiebreak", async () => {
    const { mapOpsInboxRows } = await import("@/lib/sheets");
    const rows = [
      ["timestamp", "type", "subject", "body"],
      ["8/29/2026 08:00:00", "DIGEST", "Daily digest", "a"],
      ["8/29/2026 15:00:00", "ALERT", "Invalid hire row", "b"],
      ["not-a-date", "ALERT", "odd", "c"],
    ];
    const msgs = mapOpsInboxRows(rows);
    expect(msgs.map((m) => m.subject)).toEqual(["Invalid hire row", "Daily digest", "odd"]);
  });
});
