import { describe, expect, it } from "vitest";
import { mapTrackerRows, mapOutboxRows, mapConfig } from "@/lib/sheets";

const TRACKER = [
  ["hire_id", "name", "email", "license", "state", "start_date", "manager", "status", "welcome_sent_at", "welcome_status", "error_detail", "is_demo"],
  ["H-0001", "Maria Chen", "a+maria@gmail.com", "LMFT", "CA", "8/3/2026", "Dana", "Onboarded", "7/20/2026", "SENT", "", "FALSE"],
  ["H-0005", "Daniel Reyes", "daniel.reyes@", "PsyD", "FL", "9/14/2026", "Dana", "Hired", "", "INVALID", 'invalid email: "daniel.reyes@"', "FALSE"],
  ["", "", "", "", "", "", "", "", "", "", "", ""],
  ["H-0011", "Short Row"],
];

describe("mapTrackerRows", () => {
  it("maps rows, skips blanks, pads short rows", () => {
    const hires = mapTrackerRows(TRACKER);
    expect(hires).toHaveLength(3);
    expect(hires[0]).toMatchObject({ hireId: "H-0001", name: "Maria Chen", welcomeStatus: "SENT", isDemo: false });
    expect(hires[1].errorDetail).toContain("invalid email");
    expect(hires[2]).toMatchObject({ hireId: "H-0011", email: "", isDemo: false });
  });
});

describe("mapOutboxRows", () => {
  it("maps and returns newest first", () => {
    const rows = [
      ["hire_id", "to", "subject", "body_html", "mode", "sent_at"],
      ["H-0004", "a+p@gmail.com", "Welcome, Priya!", "<div>hi</div>", "DRY_RUN", "8/29/2026 15:21:32"],
      ["H-0006", "a+e@gmail.com", "Welcome, Emily!", "<div>yo</div>", "LIVE", "8/29/2026 16:00:00"],
    ];
    const emails = mapOutboxRows(rows);
    expect(emails[0].hireId).toBe("H-0006");
    expect(emails[1].mode).toBe("DRY_RUN");
  });
});

describe("mapConfig", () => {
  it("builds a key/value object, skipping the header", () => {
    const cfg = mapConfig([["key", "value"], ["dry_run", "TRUE"], ["last_run_at", "2026-08-29T20:24:47.383Z"]]);
    expect(cfg.dry_run).toBe("TRUE");
    expect(cfg.last_run_at).toContain("2026");
  });
});
