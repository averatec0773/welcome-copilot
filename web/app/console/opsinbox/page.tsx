"use client";
import { useState } from "react";
import { usePoll } from "@/lib/usePoll";
import type { OpsInboxMessage } from "@/lib/sheets";
import { Explain } from "../Explain";

export default function OpsInboxPage() {
  const { data, error } = usePoll<{ messages: OpsInboxMessage[] }>("/api/opsinbox");
  const [openKey, setOpenKey] = useState<string | null>(null);
  if (error) return <p className="card">Operator Inbox unavailable: {error}</p>;
  if (!data) return <p>Loading operator inbox…</p>;
  const messages = data.messages;
  return (
    <section>
      <Explain
        title="The pipeline doesn't just log — it talks to its operator"
        points={[
          "These are the actual emails it sends: instant alerts when something needs a human (defense 1) and the 8:00 daily digest (defense 3).",
          "If this inbox goes quiet AND the dead-man's-switch stays green, things are genuinely fine.",
        ]}
      />
      {messages.length === 0 ? (
        <p className="card" style={{ color: "var(--muted)" }}>
          No operator mail yet — the first daily digest lands at 8:00.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {messages.map((m, i) => {
            const key = `${m.timestamp}-${i}`;
            const open = openKey === key;
            return (
              <div key={key} className="card" style={{ padding: 0 }}>
                <button
                  onClick={() => setOpenKey(open ? null : key)}
                  style={{
                    display: "flex", width: "100%", alignItems: "center", gap: 10,
                    textAlign: "left", border: "none", background: "transparent",
                    cursor: "pointer", padding: "12px 16px",
                  }}
                >
                  <span className={`badge ${m.type === "ALERT" ? "DRAFTED" : "neutral"}`}>{m.type}</span>
                  <strong style={{ fontSize: 14 }}>{m.subject}</strong>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>{m.timestamp}</span>
                </button>
                {open && (
                  <pre
                    style={{
                      margin: 0, padding: "0 16px 14px", fontSize: 13, fontFamily: "inherit",
                      whiteSpace: "pre-wrap", color: "var(--ink)",
                    }}
                  >
                    {m.body}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
