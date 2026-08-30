"use client";
import type { CSSProperties } from "react";
import { usePoll } from "@/lib/usePoll";
import type { Hire } from "@/lib/sheets";
import { Explain } from "../Explain";

const LEGEND: { status: string; meaning: string }[] = [
  { status: "SENT", meaning: "welcome email delivered, will never re-send" },
  { status: "DRAFTED", meaning: "dry-run rehearsal: drafted, not sent" },
  { status: "SENDING", meaning: "mid-send marker; if it sticks, a human looks — never auto-retried" },
  { status: "INVALID", meaning: "bad data caught before any email left" },
  { status: "DUPLICATE", meaning: "same person twice — only the first row may ever send" },
];

function StatusLegend() {
  return (
    <div
      className="card"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 16 }}
    >
      {LEGEND.map((l) => (
        <div key={l.status} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className={`badge ${l.status}`}>{l.status}</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{l.meaning}</span>
        </div>
      ))}
    </div>
  );
}

const CHIP_STYLE: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const ARROW = <span style={{ color: "var(--muted)", fontSize: 13 }}>→</span>;

function LifecycleStrip() {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span style={CHIP_STYLE}>Interviewing</span>
        {ARROW}
        <span style={CHIP_STYLE}>Offer</span>
        {ARROW}
        <span style={{ ...CHIP_STYLE, fontWeight: 700 }}>Hired</span>
        {ARROW}
        <div
          style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: "var(--radius)",
            border: "1px dashed var(--border)", background: "var(--accent-soft)",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginRight: 4 }}>
            pipeline, every 5 min
          </span>
          <span style={CHIP_STYLE}>validate</span>
          {ARROW}
          <span style={CHIP_STYLE}>render</span>
          {ARROW}
          <span style={CHIP_STYLE}>archive</span>
          {ARROW}
          <span style={CHIP_STYLE}>send</span>
        </div>
        {ARROW}
        <span style={{ ...CHIP_STYLE, fontWeight: 700 }}>SENT</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0" }}>
        fails validation → INVALID · same email twice → DUPLICATE
      </p>
    </div>
  );
}

export default function TrackerPage() {
  const { data, error, refreshedAt } = usePoll<{ hires: Hire[] }>("/api/tracker");
  if (error) return <p className="card">Tracker unavailable: {error}</p>;
  if (!data) return <p>Loading tracker…</p>;
  return (
    <section>
      <Explain
        title="This is the shared hiring spreadsheet, live"
        points={[
          "It's the same sheet HR already edits — the link at the top right says so.",
          "The pipeline watches the status column: “Hired” is the trigger.",
          "The Welcome email column is the pipeline writing its own result back.",
          "Two rows are deliberately broken (a bad address → INVALID, a duplicate → DUPLICATE) to show the guards working.",
        ]}
      />
      <StatusLegend />
      <LifecycleStrip />
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        {refreshedAt && `Refreshed ${refreshedAt.toLocaleTimeString()}.`}
      </p>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data">
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Welcome email</th><th>Status</th><th>Start</th>
              <th className="hide-sm">License</th><th className="hide-sm">State</th>
              <th className="hide-sm">Email</th><th className="hide-sm">Detail</th>
            </tr>
          </thead>
          <tbody>
            {data.hires.map((h) => (
              <tr key={h.hireId}>
                <td>{h.hireId}{h.isDemo ? " 🧪" : ""}</td>
                <td>{h.name}</td>
                <td>
                  {h.welcomeStatus ? (
                    <span className={`badge ${h.welcomeStatus}`}>{h.welcomeStatus}</span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>—</span>
                  )}
                </td>
                <td><span className="badge neutral">{h.status}</span></td>
                <td>{h.startDate}</td>
                <td className="hide-sm">{h.license}</td>
                <td className="hide-sm">{h.state}</td>
                <td className="hide-sm" style={{ color: "var(--muted)" }}>{h.email}</td>
                <td className="hide-sm" style={{ color: "var(--error)", fontSize: 13 }}>{h.errorDetail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
