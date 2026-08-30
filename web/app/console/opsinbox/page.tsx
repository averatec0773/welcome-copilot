"use client";
import { useState } from "react";
import { usePoll } from "@/lib/usePoll";
import type { OpsInboxMessage } from "@/lib/sheets";
import { Explain } from "../Explain";

export default function OpsInboxPage() {
  const { data, error } = usePoll<{ messages: OpsInboxMessage[] }>("/api/opsinbox");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (error) return <p className="card">Operator Inbox unavailable: {error}</p>;
  if (!data) return <p>Loading operator inbox…</p>;
  const messages = data.messages;
  const keyOf = (m: OpsInboxMessage) => `${m.timestamp}-${m.subject}`;
  const current = messages.find((m) => keyOf(m) === selectedKey) ?? messages[0];
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
        <div className="outbox-grid">
          <div className="card" style={{ padding: 0, maxHeight: 560, overflowY: "auto" }}>
            {messages.map((m) => (
              <button
                key={keyOf(m)}
                onClick={() => setSelectedKey(keyOf(m))}
                style={{
                  display: "block", width: "100%", textAlign: "left", border: "none",
                  borderBottom: "1px solid var(--border)", cursor: "pointer", padding: "12px 14px",
                  background: current && keyOf(m) === keyOf(current) ? "var(--accent-soft)" : "transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{m.subject}</strong>
                  <span className={`badge ${m.type === "ALERT" ? "DRAFTED" : "neutral"}`}>{m.type}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{m.timestamp}</div>
              </button>
            ))}
          </div>
          <div className="card" style={{ padding: 0, minHeight: 560 }}>
            {current ? (
              <>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <strong>{current.subject}</strong>
                  <span style={{ color: "var(--muted)" }}> · {current.timestamp}</span>
                </div>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, padding: 16, margin: 0 }}>
                  {current.body}
                </pre>
              </>
            ) : (
              <p style={{ padding: 16 }}>Select a message.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
