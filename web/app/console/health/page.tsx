"use client";
import { usePoll } from "@/lib/usePoll";
import type { LogEntry } from "@/lib/sheets";
import { Explain } from "../Explain";

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

// Parses a RUN log line's counts string (see apps-script/main.gs log_ calls),
// e.g. "3 eligible · 1 sent · 1 drafted · 1 duplicate · 0 invalid · 0 held",
// into a plain sentence a lead can read without knowing the pipeline's internals.
function runSentence(entry: LogEntry): string {
  const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  const num = (label: string) => {
    const m = new RegExp(`(\\d+)\\s+${label}`).exec(entry.result);
    return m ? parseInt(m[1], 10) : 0;
  };
  const eligible = num("eligible");
  const sent = num("sent");
  const drafted = num("drafted");
  const dup = num("duplicate");
  const invalid = num("invalid");
  const held = num("held");
  const parts: string[] = [];
  if (sent) parts.push(`sent ${sent}`);
  if (drafted) parts.push(`drafted ${drafted}`);
  if (dup) parts.push(`flagged ${dup} duplicate${dup === 1 ? "" : "s"}`);
  if (invalid) parts.push(`${invalid} invalid`);
  if (held) parts.push(`${held} held for quota`);
  const outcome = parts.length ? parts.join(", ") : "nothing to do";
  return `${time} · woke up, found ${eligible} eligible: ${outcome}`;
}

function digestSentence(entry: LogEntry): string {
  const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  return `${time} · daily digest sent to the operator`;
}

export default function HealthPage() {
  const { data, error } = usePoll<Health>("/api/health");
  if (error) return <p className="card">Health unavailable: {error}</p>;
  if (!data) return <p>Loading health…</p>;
  const f = freshness(data.lastRunAt);
  const runEntries = data.logs.filter((l) => l.action === "RUN" || l.action === "DIGEST");
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Health</h2>
      <Explain
        title="Three ways to notice a failure"
        points={[
          "Alert emails fire the moment something needs a human. They land in the Operator Inbox.",
          "The dead-man's switch badge below watches for silence itself, which catches the failures that can't report themselves.",
          "The daily digest is the bottom line a human actually reads, once a day.",
          "The run log below shows every time the pipeline woke up and what it did.",
        ]}
      />
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
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Dead man&rsquo;s switch</div>
          {data.badgeUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={data.badgeUrl} alt="healthchecks.io status" style={{ marginTop: 8 }} />
          ) : (
            "—"
          )}
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Alerts fire when the pipeline goes silent, whatever the cause.
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

      <div>
        <h3 style={{ margin: "0 0 10px" }}>Recent pipeline runs</h3>
        {runEntries.length === 0 ? (
          <p className="card" style={{ color: "var(--muted)", fontSize: 13 }}>
            No runs logged yet. The pipeline fires every 5 minutes once the trigger is set up.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {runEntries.map((l, i) => (
              <div key={`${l.runId}-${i}`} className="card" style={{ padding: "10px 14px", fontSize: 14 }}>
                {l.action === "DIGEST" ? digestSentence(l) : runSentence(l)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ margin: "0 0 10px" }}>Raw log (last 20)</h3>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr><th>Time</th><th className="hide-sm">Run</th><th>Hire</th><th>Action</th><th>Result</th></tr>
            </thead>
            <tbody>
              {data.logs.map((l, i) => (
                <tr key={`${l.runId}-${l.hireId}-${i}`}>
                  <td>{l.timestamp}</td>
                  <td className="hide-sm" style={{ fontFamily: "monospace", fontSize: 12 }}>{l.runId}</td>
                  <td>{l.hireId}</td>
                  <td><span className={`badge ${l.action === "SEND" ? "SENT" : l.action === "DRAFT" ? "DRAFTED" : l.action === "DUPLICATE" ? "DUPLICATE" : ["ERROR", "INVALID"].includes(l.action) ? "ERROR" : "neutral"}`}>{l.action}</span></td>
                  <td style={{ fontSize: 13 }}>{l.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)" }}>
          Validation messages are redacted. The log identifies a row by its hire_id,
          never by name or email address.
        </p>
      </div>
    </section>
  );
}
