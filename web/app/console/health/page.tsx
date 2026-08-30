"use client";
import { usePoll } from "@/lib/usePoll";
import type { LogEntry } from "@/lib/sheets";

type Health = {
  lastRunAt: string;
  mailQuotaRemaining: string;
  dryRun: boolean;
  badgeUrl: string;
  logs: LogEntry[];
};

function freshness(lastRunAt: string): { label: string; color: string } {
  if (!lastRunAt) return { label: "never ran", color: "var(--error)" };
  const mins = (Date.now() - new Date(lastRunAt).getTime()) / 60_000;
  if (mins < 15) return { label: `${Math.round(mins)} min ago`, color: "var(--sent)" };
  if (mins < 60) return { label: `${Math.round(mins)} min ago`, color: "var(--drafted)" };
  return { label: `${Math.round(mins / 60)} h ago`, color: "var(--error)" };
}

export default function HealthPage() {
  const { data, error } = usePoll<Health>("/api/health");
  if (error) return <p className="card">Health unavailable: {error}</p>;
  if (!data) return <p>Loading health…</p>;
  const f = freshness(data.lastRunAt);
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div className="stat-grid">
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Last pipeline run</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: f.color }}>{f.label}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Red? Check the Apps Script triggers, then the RUNBOOK.
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Mode</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.dryRun ? "DRY-RUN" : "LIVE"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            LIVE sends real email; DRY-RUN only drafts.
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Mail quota left today</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.mailQuotaRemaining || "—"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Gmail allows ~100/day; the pipeline holds sends below 20 left.
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Dead man's switch</div>
          {data.badgeUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={data.badgeUrl} alt="healthchecks.io status" style={{ marginTop: 8 }} />
          ) : (
            "—"
          )}
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Alerts fire when the pipeline goes silent — whatever the cause.
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Assistant budget</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>300/day</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Free-form answers are capped; suggested questions are cached.
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data">
          <thead>
            <tr><th>Time</th><th>Run</th><th>Hire</th><th>Action</th><th>Result</th></tr>
          </thead>
          <tbody>
            {data.logs.map((l, i) => (
              <tr key={`${l.runId}-${l.hireId}-${i}`}>
                <td>{l.timestamp}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{l.runId}</td>
                <td>{l.hireId}</td>
                <td><span className={`badge ${l.action === "SEND" ? "SENT" : l.action === "DRAFT" ? "DRAFTED" : l.action === "DUPLICATE" ? "DUPLICATE" : ["ERROR", "INVALID"].includes(l.action) ? "ERROR" : "neutral"}`}>{l.action}</span></td>
                <td style={{ fontSize: 13 }}>{l.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)" }}>
        Validation messages are redacted — the log carries hire_ids, not names or addresses.
      </p>
    </section>
  );
}
