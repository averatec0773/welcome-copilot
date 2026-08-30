"use client";
import { useState } from "react";
import { usePoll } from "@/lib/usePoll";
import type { OutboxEmail } from "@/lib/sheets";

export default function OutboxPage() {
  const { data, error } = usePoll<{ emails: OutboxEmail[] }>("/api/outbox");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (error) return <p className="card">Outbox unavailable: {error}</p>;
  if (!data) return <p>Loading outbox…</p>;
  const emails = data.emails;
  const keyOf = (e: OutboxEmail) => `${e.hireId}-${e.sentAt}`;
  const current = emails.find((e) => keyOf(e) === selectedKey) ?? emails[0];
  return (
    <section>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Every email is archived at the moment it is rendered — the Log records whether
        it actually left.
      </p>
      <div className="outbox-grid">
        <div className="card" style={{ padding: 0, maxHeight: 560, overflowY: "auto" }}>
          {emails.length === 0 && <p style={{ padding: 16 }}>No emails yet.</p>}
          {emails.map((e) => (
            <button
              key={keyOf(e)}
              onClick={() => setSelectedKey(keyOf(e))}
              style={{
                display: "block", width: "100%", textAlign: "left", border: "none",
                borderBottom: "1px solid var(--border)", cursor: "pointer", padding: "12px 14px",
                background: current && keyOf(e) === keyOf(current) ? "var(--accent-soft)" : "transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{e.to}</strong>
                <span className={`badge ${e.mode}`}>
                  {e.mode === "DRY_RUN" ? "DRAFT — not sent" : e.mode}
                </span>
              </div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{e.subject}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{e.sentAt}</div>
            </button>
          ))}
        </div>
        <div className="card" style={{ padding: 0, minHeight: 560 }}>
          {current ? (
            <>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <strong>{current.subject}</strong>
                <span style={{ color: "var(--muted)" }}> · to {current.to} · {current.sentAt}</span>
              </div>
              <iframe
                sandbox=""
                srcDoc={current.bodyHtml}
                title={`Email to ${current.to}`}
                style={{ width: "100%", height: 520, border: "none", background: "#fff" }}
              />
            </>
          ) : (
            <p style={{ padding: 16 }}>Select an email.</p>
          )}
        </div>
      </div>
    </section>
  );
}
