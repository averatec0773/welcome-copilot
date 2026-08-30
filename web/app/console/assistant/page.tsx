"use client";
import { useEffect, useRef, useState } from "react";
import { Explain } from "../Explain";

type Source = { docTitle: string; section: string; snippet: string; updated: string };
type Msg = { role: "user" | "assistant"; text: string; sources?: Source[]; limited?: boolean; cached?: boolean };

export default function AssistantPage() {
  const [suggested, setSuggested] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockNote, setUnlockNote] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ask").then((r) => r.json()).then((j) => setSuggested(j.suggested ?? []));
    fetch("/api/unlock").then((r) => r.json()).then((j) => setUnlocked(!!j.unlocked));
  }, []);
  useEffect(() => {
    // Braces matter: scrollIntoView returns a Promise in newer Chrome, and an
    // expression-bodied arrow would hand that Promise to React as the effect
    // "cleanup", crashing on unmount.
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function unlock(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const c = code.trim();
    if (!c || unlockBusy) return;
    setUnlockBusy(true);
    setUnlockNote("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setUnlocked(true);
        setCode("");
        setUnlockNote("Unlocked — ask anything.");
      } else {
        setUnlockNote("That code didn't work — check the application materials and try again.");
      }
    } catch {
      setUnlockNote("Network error — please retry.");
    } finally {
      setUnlockBusy(false);
    }
  }

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
        const friendly =
          j.error === "locked"
            ? "Free-form questions need an access code — it's included in the application materials. The four suggested questions work for everyone."
            : j.error === "rate_limited"
              ? "Whoa — one question at a time please. Try again in a minute."
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
      setMsgs((m) => [...m, { role: "assistant", text: "Network error — please retry." }]);
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
      <Explain
        title="An assistant that only knows the handbook"
        points={[
          "Answers come from 9 onboarding docs, with citations and each doc's last-updated date.",
          "If the handbook doesn't cover it, it says so — instead of guessing.",
          "Suggested questions are free for everyone; free-form questions need the access code.",
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
                    <strong>[{j + 1}] {s.docTitle} — {s.section}</strong>
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
        <form
          onSubmit={unlock}
          style={{
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
            marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius)",
            border: "1px solid var(--border)", background: "var(--accent-soft)", fontSize: 13,
          }}
        >
          <span style={{ color: "var(--muted)" }}>
            Suggested questions are open to everyone. Have an access code?
          </span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            style={{
              padding: "6px 10px", borderRadius: "var(--radius)",
              border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)",
            }}
          />
          <button
            type="submit"
            disabled={unlockBusy}
            style={{
              padding: "6px 14px", borderRadius: "var(--radius)", border: "none",
              background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Unlock
          </button>
          {unlockNote && <span style={{ color: "var(--muted)" }}>{unlockNote}</span>}
        </form>
      )}
      {unlocked && unlockNote && (
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>{unlockNote}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
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
