"use client";
import { usePoll } from "@/lib/usePoll";
import type { Hire } from "@/lib/sheets";

export default function TrackerPage() {
  const { data, error, refreshedAt } = usePoll<{ hires: Hire[] }>("/api/tracker");
  if (error) return <p className="card">Tracker unavailable: {error}</p>;
  if (!data) return <p>Loading tracker…</p>;
  return (
    <section>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Live view of the shared hiring spreadsheet (the source of truth HR edits).
        {refreshedAt && ` Refreshed ${refreshedAt.toLocaleTimeString()}.`}
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
