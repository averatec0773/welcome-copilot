"use client";
import type { CSSProperties } from "react";
import { Fragment, useEffect, useState } from "react";
import { usePoll } from "@/lib/usePoll";
import type { Hire } from "@/lib/sheets";
import SimulatePanel from "../SimulatePanel";
import { useUnlock } from "../UnlockContext";

// Rows can arrive without a hire_id in edge cases (a mid-append row, a
// malformed sheet edit) — fall back to email so the row key and the
// expand/collapse toggle never collide on an empty string.
const rowKey = (h: Hire) => h.hireId || h.email;

// Date-only ISO values ("2026-07-14") parse as UTC midnight in JS, which can
// display as the previous day in a negative-offset timezone — pin them to
// local midnight instead. Anything else (or unparseable) passes through.
function parseDate(s: string): Date | null {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(s: string): string {
  const d = parseDate(s);
  if (!d) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Kept short on purpose: these five have to sit on one line at 1280w.
const LEGEND: { status: string; meaning: string }[] = [
  { status: "SENT", meaning: "delivered once" },
  { status: "DRAFTED", meaning: "dry run only" },
  { status: "SENDING", meaning: "mid-send, human reviews" },
  { status: "INVALID", meaning: "bad data, not sent" },
  { status: "DUPLICATE", meaning: "only the first sends" },
];

function StatusLegend() {
  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", alignItems: "baseline",
        columnGap: 14, rowGap: 6, margin: "0 2px 14px",
      }}
    >
      {LEGEND.map((l) => (
        <span key={l.status} style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
          <span className={`badge ${l.status}`}>{l.status}</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{l.meaning}</span>
        </span>
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

// Hidden on small screens: the strip stacks vertically there, and a
// right-pointing arrow on its own line reads as a dangling glyph.
const ARROW = <span className="hide-sm" style={{ color: "var(--muted)", fontSize: 13 }}>→</span>;

function LifecycleStrip() {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-ink)", margin: "0 0 10px" }}>
        How a row becomes a sent email
      </p>
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
            the pipeline
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
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px 0 0" }}>
        Rows edited by hand in the sheet are picked up within 5 minutes; the Simulate button
        triggers the same run immediately. A row that fails validation is marked INVALID, and a
        second row with the same email is marked DUPLICATE. Two rows above are broken on
        purpose so you can watch both guards fire.
      </p>
    </div>
  );
}

function Timeline({ hire }: { hire: Hire }) {
  const startParsed = parseDate(hire.startDate);
  const startLabel = startParsed && startParsed.getTime() > Date.now() ? "Starts" : "Started";
  const stages: { label: string; value: string }[] = [
    { label: "Applied", value: hire.appliedOn },
    { label: "Interviewed", value: hire.interviewedOn },
    { label: "Offer", value: hire.offerOn },
    { label: startLabel, value: hire.startDate },
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
            {s.label} <strong>{fmtDate(s.value)}</strong>
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
        {/* Hire ID lives here too: the column is hidden below 760px, and the
            Health log identifies rows by hire_id at every width. */}
        <div><span style={{ color: "var(--muted)" }}>Hire ID:</span> {hire.hireId || "—"}</div>
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

// Stays mounted for the rest of the page's life once opened once, so
// SimulatePanel's in-flight polling survives an accidental overlay click —
// visibility toggles via display none/flex instead of unmount/remount.
function SimulateModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        display: visible ? "flex" : "none", alignItems: "flex-start", justifyContent: "center",
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

type SortKey = "id" | "name" | "welcome" | "status" | "start" | "license" | "state" | "email";

// null means "no value": those rows sort last in either direction, so an
// empty Start or Welcome email column never floats to the top.
function sortValue(h: Hire, key: SortKey): string | number | null {
  switch (key) {
    case "id": return h.hireId || null;
    case "name": return h.name ? h.name.toLowerCase() : null;
    case "welcome": return h.welcomeStatus || null;
    case "status": return h.status || null;
    case "start": { const d = parseDate(h.startDate); return d ? d.getTime() : null; }
    case "license": return h.license || null;
    case "state": return h.state || null;
    case "email": return h.email ? h.email.toLowerCase() : null;
  }
}

function sortHires(hires: Hire[], sort: { key: SortKey; dir: 1 | -1 } | null): Hire[] {
  if (!sort) return hires;
  return [...hires].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    // localeCompare so accented names (Éloïse) sort beside their base letter
    // instead of after Z.
    if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * sort.dir;
    if (va < vb) return -sort.dir;
    if (va > vb) return sort.dir;
    return 0;
  });
}

export default function TrackerPage() {
  const { unlocked, promptUnlock } = useUnlock();
  const { data, error, refreshedAt } = usePoll<{ hires: Hire[] }>("/api/tracker");
  // mounted: becomes true the first time an unlocked visitor opens the
  // modal, then stays true for the rest of the page's life so SimulatePanel
  // (and its in-flight polling) is never torn down. visible only toggles
  // display — see SimulateModal.
  const [modalMounted, setModalMounted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Click a header to sort ascending, again for descending, a third time to
  // restore the sheet's own order.
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));
  }

  const sortTh = (k: SortKey, label: string, className?: string) => (
    <th
      className={className}
      aria-sort={sort?.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
      onClick={() => toggleSort(k)}
      title="Click to sort"
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      {label}
      <span
        aria-hidden
        style={{
          marginLeft: 4, fontSize: 10,
          color: sort?.key === k ? "var(--accent)" : "var(--muted)",
          opacity: sort?.key === k ? 1 : 0.55,
        }}
      >
        {sort?.key === k ? (sort.dir === 1 ? "▲" : "▼") : "▲▼"}
      </span>
    </th>
  );

  function openSimulate() {
    if (unlocked === null) return; // access check still in flight
    // Locked visitors never see the modal — send them to the one place a
    // code is entered instead (header chip opens + flashes).
    if (!unlocked) {
      promptUnlock();
      return;
    }
    setModalMounted(true);
    setModalVisible(true);
  }

  // No early returns: the simulate modal (and SimulatePanel's in-flight
  // polling) must survive a transient poll error, so error and loading are
  // rendered as states inside the one tree the modal lives in.
  return (
    <section>
      {error && (
        <p className="card" style={{ marginBottom: 14 }}>
          Tracker unavailable: {error}
          {data ? " Showing the last loaded data." : ""}
        </p>
      )}
      {!data && !error && <p>Loading tracker…</p>}
      {data && (
        <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Tracker</h2>
          {refreshedAt && (
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              Refreshed {refreshedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={openSimulate}
          style={{
            padding: "10px 18px", borderRadius: "var(--radius)", border: "none",
            background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          ▶ Simulate a hire
        </button>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 0 14px", maxWidth: 760 }}>
        This is the same shared sheet HR edits, read live. The pipeline watches the Status
        column, and the Welcome email column is where it writes its result back. Click a row
        for the full candidate story.
      </p>
      <StatusLegend />
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data">
          <thead>
            <tr>
              {sortTh("id", "ID", "nowrap hide-sm")}
              {sortTh("name", "Name", "nowrap")}
              {sortTh("welcome", "Welcome email")}
              {sortTh("status", "Status")}
              {sortTh("start", "Start", "nowrap hide-sm")}
              {sortTh("license", "License", "hide-md")}
              {sortTh("state", "State", "hide-md")}
              {sortTh("email", "Email", "hide-md")}
            </tr>
          </thead>
          <tbody>
            {sortHires(data.hires, sort).map((h) => {
              const key = rowKey(h);
              const open = expandedId === key;
              return (
                <Fragment key={key}>
                  {/* Keyboard-reachable: the expanded row is the only place
                      the error reason lives, and on mobile the only place the
                      hire ID and start date live. */}
                  <tr
                    className="tracker-row"
                    tabIndex={0}
                    aria-expanded={open}
                    onClick={() => setExpandedId(open ? null : key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedId(open ? null : key);
                      }
                    }}
                  >
                    <td className="nowrap hide-sm">{h.hireId}</td>
                    <td className="nowrap">{h.name}</td>
                    <td>
                      {h.welcomeStatus ? (
                        <span className={`badge ${h.welcomeStatus}`}>{h.welcomeStatus}</span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td><span className="badge neutral">{h.status}</span></td>
                    <td className="nowrap hide-sm">{fmtDate(h.startDate)}</td>
                    <td className="hide-md">{h.license}</td>
                    <td className="hide-md">{h.state}</td>
                    <td className="hide-md" style={{ color: "var(--muted)" }}>{h.email}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
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
      <LifecycleStrip />
        </>
      )}
      {modalMounted && <SimulateModal visible={modalVisible} onClose={() => setModalVisible(false)} />}
    </section>
  );
}
