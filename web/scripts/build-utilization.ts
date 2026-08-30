// Builds content/utilization.json from the mock monthly billing CSV exports
// (data/billing-export-*.csv) plus data/utilization.sql. Runs at build time
// only (npm run prebuild) — nothing at runtime touches these files or
// sql.js; the page just statically imports the resulting JSON.
//
// This is the point of the exercise: several core clinical/billing systems
// expose no API, only a scheduled manual CSV export. This script treats
// that export as the interface — validate loudly, then report.
import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database } from "sql.js";

type Row = {
  date: string;
  clinicianId: string;
  clinician: string;
  state: string;
  sessions: number;
  billedMinutes: number;
  payer: string;
};

type Validation = { check: string; status: "pass" | "warn"; detail: string };

const DATA_DIR = path.join(process.cwd(), "data");
const CONTENT_DIR = path.join(process.cwd(), "content");

const ROSTER: Record<string, string> = {
  "C-001": "Maria Chen",
  "C-002": "James Okafor",
  "C-003": "Sarah Kim",
  "C-004": "Priya Natarajan",
  "C-005": "Emily Tran",
};

// Hand-rolled split — these exports have no quoted commas, so a real CSV
// parser would be more machinery than the data needs.
function parseCsv(text: string, month: string): { rows: Row[]; file: string } {
  const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
  const [, ...body] = lines; // drop header
  const rows = body.map((line) => {
    const [date, clinicianId, clinician, state, sessions, billedMinutes, payer] = line.split(",");
    return {
      date: date.trim(),
      clinicianId: clinicianId.trim(),
      clinician: clinician.trim(),
      state: state.trim(),
      sessions: Number(sessions),
      billedMinutes: Number(billedMinutes),
      payer: payer.trim(),
    };
  });
  return { rows, file: month };
}

function runValidations(byMonth: Map<string, Row[]>): Validation[] {
  const out: Validation[] = [];
  const months = [...byMonth.keys()].sort();

  // 1. Row counts within a sane range per month.
  {
    const counts = months.map((m) => `${m}: ${byMonth.get(m)!.length}`).join(", ");
    const outOfRange = months.filter((m) => {
      const n = byMonth.get(m)!.length;
      return n < 40 || n > 80;
    });
    out.push({
      check: "Row count per month within expected range (40-80)",
      status: outOfRange.length === 0 ? "pass" : "warn",
      detail: outOfRange.length === 0
        ? `All months in range (${counts}).`
        : `Out of range: ${outOfRange.join(", ")} (${counts}).`,
    });
  }

  // 2. Every row's date falls inside the month its file claims to cover.
  {
    const stray: string[] = [];
    for (const m of months) {
      for (const r of byMonth.get(m)!) {
        if (!r.date.startsWith(m)) stray.push(`${r.date} (${r.clinicianId}) in ${m} export`);
      }
    }
    out.push({
      check: "All dates fall inside their export's month",
      status: stray.length === 0 ? "pass" : "warn",
      detail: stray.length === 0 ? "No stray dates." : `Stray rows: ${stray.join("; ")}.`,
    });
  }

  // 3. No exact-duplicate rows (same export re-pasted, a double-run, etc).
  {
    const seen = new Map<string, number>();
    for (const rows of byMonth.values()) {
      for (const r of rows) {
        const key = [r.date, r.clinicianId, r.clinician, r.state, r.sessions, r.billedMinutes, r.payer].join("|");
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }
    const dupes = [...seen.entries()].filter(([, n]) => n > 1);
    out.push({
      check: "No exact-duplicate rows",
      status: dupes.length === 0 ? "pass" : "warn",
      detail: dupes.length === 0 ? "No duplicates found." : `${dupes.length} duplicate row(s) found.`,
    });
  }

  // 4. Every clinician_id in the export is a known roster member.
  {
    const unknown = new Map<string, { clinician: string; dates: string[] }>();
    for (const rows of byMonth.values()) {
      for (const r of rows) {
        if (ROSTER[r.clinicianId]) continue;
        const entry = unknown.get(r.clinicianId) ?? { clinician: r.clinician, dates: [] };
        entry.dates.push(r.date);
        unknown.set(r.clinicianId, entry);
      }
    }
    const listed = [...unknown.entries()]
      .map(([id, { clinician, dates }]) => `${id} (${clinician}) on ${dates.join(", ")}`)
      .join("; ");
    out.push({
      check: "Every clinician_id matches the known roster",
      status: unknown.size === 0 ? "pass" : "warn",
      detail: unknown.size === 0
        ? "All clinician_ids match the roster."
        : `Unknown clinician_id(s): ${listed} (excluded from the totals below).`,
    });
  }

  // 5. sessions is always positive.
  {
    const bad: string[] = [];
    for (const [m, rows] of byMonth) {
      for (const r of rows) {
        if (!(r.sessions > 0)) bad.push(`${r.date} ${r.clinicianId} in ${m} (sessions=${r.sessions})`);
      }
    }
    out.push({
      check: "sessions > 0 on every row",
      status: bad.length === 0 ? "pass" : "warn",
      detail: bad.length === 0 ? "All rows have positive sessions." : `Bad rows: ${bad.join("; ")}.`,
    });
  }

  // 6. Month-over-month total-sessions drift stays within a plausible range.
  {
    if (months.length >= 2) {
      const flags: string[] = [];
      for (let i = 1; i < months.length; i++) {
        const prevTotal = byMonth.get(months[i - 1])!.reduce((s, r) => s + r.sessions, 0);
        const curTotal = byMonth.get(months[i])!.reduce((s, r) => s + r.sessions, 0);
        const drift = prevTotal === 0 ? 0 : ((curTotal - prevTotal) / prevTotal) * 100;
        if (Math.abs(drift) > 40) {
          flags.push(`${months[i - 1]} -> ${months[i]}: ${drift.toFixed(1)}%`);
        }
      }
      out.push({
        check: "Month-over-month total-sessions drift within 40%",
        status: flags.length === 0 ? "pass" : "warn",
        detail: flags.length === 0 ? "Drift within range for all consecutive months." : `Large drift: ${flags.join(", ")}.`,
      });
    }
  }

  return out;
}

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(process.cwd(), "node_modules/sql.js/dist", file),
  });
  const db: Database = new SQL.Database();

  db.run(`
    CREATE TABLE billing (
      date TEXT NOT NULL,
      clinician_id TEXT NOT NULL,
      clinician TEXT NOT NULL,
      state TEXT NOT NULL,
      sessions INTEGER NOT NULL,
      billed_minutes INTEGER NOT NULL,
      payer TEXT NOT NULL
    );
  `);

  const files = [
    { path: path.join(DATA_DIR, "billing-export-2026-07.csv"), month: "2026-07" },
    { path: path.join(DATA_DIR, "billing-export-2026-08.csv"), month: "2026-08" },
  ];

  const byMonth = new Map<string, Row[]>();
  const stmt = db.prepare(
    "INSERT INTO billing (date, clinician_id, clinician, state, sessions, billed_minutes, payer) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (const f of files) {
    const text = fs.readFileSync(f.path, "utf8");
    const { rows } = parseCsv(text, f.month);
    byMonth.set(f.month, rows);
    for (const r of rows) {
      stmt.run([r.date, r.clinicianId, r.clinician, r.state, r.sessions, r.billedMinutes, r.payer]);
    }
  }
  stmt.free();

  const validations = runValidations(byMonth);

  const sqlText = fs.readFileSync(path.join(DATA_DIR, "utilization.sql"), "utf8");
  const results = db.exec(sqlText);
  const rows =
    results.length === 0
      ? []
      : results[0].values.map((v) => ({
          clinicianId: String(v[0]),
          clinician: String(v[1]),
          month: String(v[2]),
          sessionsTotal: Number(v[3]),
          hours: Number(v[4]),
          utilizationPct: Number(v[5]),
          momDeltaPct: v[6] === null ? null : Number(v[6]),
        }));

  db.close();

  const out = {
    // Static label, not Date.now() — keeps the build deterministic.
    generatedAt: "2026-08 build",
    months: [...byMonth.keys()].sort(),
    validations,
    rows,
    sqlText,
  };

  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  const dest = path.join(CONTENT_DIR, "utilization.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  process.stdout.write(`wrote ${dest} (${rows.length} rows, ${validations.filter((v) => v.status === "warn").length} warning(s))\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
