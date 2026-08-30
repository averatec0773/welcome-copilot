"use client";
import { useEffect, useRef, useState } from "react";
import { Explain } from "../Explain";
import { useUnlock } from "../UnlockContext";

type Source = { docTitle: string; section: string; snippet: string; updated: string };
type Msg = { role: "user" | "assistant"; text: string; sources?: Source[]; limited?: boolean; cached?: boolean };

const LOCKED_FREEFORM_MESSAGE =
  "Free-form questions need an access code. Enter it in the console header. The four suggested questions work for everyone.";

export default function AssistantPage() {
  const { unlocked, promptUnlock } = useUnlock();
  const [suggested, setSuggested] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ask").then((r) => r.json()).then((j) => setSuggested(j.suggested ?? []));
  }, []);
  useEffect(() => {
    // Braces matter: scrollIntoView returns a Promise in newer Chrome, and an
    // expression-bodied arrow would hand that Promise to React as the effect
    // "cleanup", crashing on unmount.
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: question }]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const j = await res.json();
      if (!res.ok) {
        if (j.error === "locked") promptUnlock();
        const friendly =
          j.error === "locked"
            ? LOCKED_FREEFORM_MESSAGE
            : j.error === "rate_limited"
              ? "One question at a time, please. Try again in a minute."
              : j.error === "daily_budget_exhausted"
                ? "The demo's daily AI budget is used up. The four suggested questions still work (cached answers)."
                : "The assistant is unavailable right now.";
        setMsgs((m) => [...m, { role: "assistant", text: friendly }]);
      } else {
        setMsgs((m) => [
          ...m,
          { role: "assistant", text: j.answer, sources: j.sources, limited: j.limited, cached: j.cached },
        ]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  const chips = (
    <div>
      <p style={{ color: "var(--muted)" }}>Try one of these:</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {suggested.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            style={{
              border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer",
              borderRadius: 999, padding: "8px 14px", fontSize: 13,
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section style={{ maxWidth: 720 }}>
      <h2 style={{ margin: "0 0 12px" }}>Assistant</h2>
      <Explain
        title="An assistant that only knows the handbook"
        points={[
          "Answers come from 9 onboarding docs, with citations and each doc's last-updated date.",
          "If the handbook doesn't cover a question, it says so instead of guessing.",
          "The four suggested questions are open to everyone. Free-form questions need the access code.",
          "Limits: 8 questions a minute per visitor, 300 a day for the whole demo.",
        ]}
      />
      <div className="card" style={{ minHeight: 380, display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.length === 0 && chips}
        {msgs.length > 0 && !unlocked && chips}
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.role === "user" ? "var(--accent-soft)" : "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "10px 14px",
              fontSize: 14,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text}
            {(m.limited || m.cached) && (
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                cached answer{m.limited ? " (daily budget reached)" : ""}
              </div>
            )}
            {m.sources && m.sources.length > 0 && (
              <details style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                <summary style={{ cursor: "pointer" }}>Sources ({m.sources.length})</summary>
                {m.sources.map((s, j) => (
                  <p key={j} style={{ margin: "6px 0" }}>
                    <strong>[{j + 1}] {s.docTitle} · {s.section}</strong>
                    {s.updated && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}> · updated {s.updated}</span>
                    )}
                    <br />
                    {s.snippet}
                  </p>
                ))}
              </details>
            )}
          </div>
        ))}
        {busy && <p style={{ color: "var(--muted)", fontSize: 13 }}>Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      {!unlocked && (
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>
          Suggested questions above are open to everyone. Free-form questions need the access
          code, entered in the console header.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const question = input.trim();
          if (!question || busy) return;
          // Access state hasn't loaded yet — don't guess. No promptUnlock()
          // here: that's for a confirmed lock, not an unknown one.
          if (unlocked === null) {
            setMsgs((m) => [...m, { role: "assistant", text: "Checking access…" }]);
            return;
          }
          if (!unlocked) {
            setInput("");
            setMsgs((m) => [
              ...m,
              { role: "user", text: question },
              { role: "assistant", text: LOCKED_FREEFORM_MESSAGE },
            ]);
            promptUnlock();
            return;
          }
          ask(question);
        }}
        style={{ display: "flex", gap: 8, marginTop: 12 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about onboarding, payroll, PTO, EHR access…"
          style={{
            flex: 1, padding: "12px 14px", borderRadius: "var(--radius)",
            border: "1px solid var(--border)", fontSize: 14, background: "var(--surface)",
          }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "12px 20px", borderRadius: "var(--radius)", border: "none",
            background: "var(--accent)", color: "#fff", fontWeight: 600, cursor: "pointer",
          }}
        >
          Ask
        </button>
      </form>
    </section>
  );
}
