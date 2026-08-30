"use client";
import type { CSSProperties } from "react";
import { Fragment, useEffect, useState } from "react";
import { usePoll } from "@/lib/usePoll";
import type { Hire } from "@/lib/sheets";
import { Explain } from "../Explain";
import SimulatePanel from "../SimulatePanel";

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

function Timeline({ hire }: { hire: Hire }) {
  const stages: { label: string; value: string }[] = [
    { label: "Applied", value: hire.appliedOn },
    { label: "Interviewed", value: hire.interviewedOn },
    { label: "Offer", value: hire.offerOn },
    { label: "Started", value: hire.startDate },
  ].filter((s) => s.value);
  if (stages.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>No timeline dates on file yet.</p>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13 }}>
      {stages.map((s, i) => (
        <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {i > 0 && <span style={{ color: "var(--muted)" }}>→</span>}
          <span>
            {s.label} <strong>{s.value}</strong>
          </span>
        </span>
      ))}
    </div>
  );
}

function CandidateDetail({ hire }: { hire: Hire }) {
  return (
    <div style={{ display: "grid", gap: 12, padding: "14px 18px" }}>
      <Timeline hire={hire} />
      <div
        style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 8, fontSize: 13,
        }}
      >
        <div><span style={{ color: "var(--muted)" }}>License:</span> {hire.license || "—"}</div>
        <div><span style={{ color: "var(--muted)" }}>State:</span> {hire.state || "—"}</div>
        <div><span style={{ color: "var(--muted)" }}>Manager:</span> {hire.manager || "—"}</div>
        <div><span style={{ color: "var(--muted)" }}>Email:</span> {hire.email || "—"}</div>
      </div>
      {hire.notes && (
        <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--muted)", margin: 0 }}>{hire.notes}</p>
      )}
      <div style={{ fontSize: 13 }}>
        <span style={{ color: "var(--muted)" }}>Welcome email:</span>{" "}
        {hire.welcomeStatus ? (
          <span className={`badge ${hire.welcomeStatus}`}>{hire.welcomeStatus}</span>
        ) : (
          <span style={{ color: "var(--muted)" }}>—</span>
        )}
        {hire.errorDetail && (
          <span style={{ color: "var(--error)", marginLeft: 8 }}>{hire.errorDetail}</span>
        )}
      </div>
    </div>
  );
}

function SimulateModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "40px 16px", zIndex: 100, overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ maxWidth: 640, width: "100%", maxHeight: "calc(100vh - 80px)", overflowY: "auto", position: "relative" }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 12, right: 12, border: "none", background: "transparent",
            fontSize: 18, cursor: "pointer", color: "var(--muted)", lineHeight: 1,
          }}
        >
          ✕
        </button>
        <SimulatePanel />
      </div>
    </div>
  );
}

export default function TrackerPage() {
  const { data, error, refreshedAt } = usePoll<{ hires: Hire[] }>("/api/tracker");
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (error) return <p className="card">Tracker unavailable: {error}</p>;
  if (!data) return <p>Loading tracker…</p>;
  return (
    <section>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, margin: 0 }}>Tracker</h2>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: "10px 18px", borderRadius: "var(--radius)", border: "none",
            background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          ▶ Simulate a hire
        </button>
      </div>
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
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>
        Click any row for the full candidate story.
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
            {data.hires.map((h) => {
              const open = expandedId === h.hireId;
              return (
                <Fragment key={h.hireId}>
                  <tr
                    className="tracker-row"
                    onClick={() => setExpandedId(open ? null : h.hireId)}
                  >
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
                  {open && (
                    <tr>
                      <td colSpan={9} style={{ padding: 0, borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                        <CandidateDetail hire={h} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {modalOpen && <SimulateModal onClose={() => setModalOpen(false)} />}
    </section>
  );
}
