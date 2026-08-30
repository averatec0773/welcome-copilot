"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { Explain } from "../Explain";
import { useUnlock } from "../UnlockContext";

type Source = { docTitle: string; section: string; snippet: string; updated: string };
type Msg = { role: "user" | "assistant"; text: string; sources?: Source[]; limited?: boolean; cached?: boolean };
type HandbookDoc = { slug: string; title: string; category: string; updated: string };
type HandbookContent = HandbookDoc & { content: string };

const LOCKED_FREEFORM_MESSAGE =
  "Free-form questions need an access code. Enter it in the console header. The four suggested questions work for everyone.";

// The handbook is plain markdown with only three constructs: "## " section
// headings, "- " lists, and **bold** / `code` inline. Render those directly
// instead of pulling in a markdown library.
function inlineMd(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code key={i} style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4, fontSize: 13 }}>
          {p.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

function MarkdownDoc({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines[0].startsWith("## ")) {
          const rest = lines.slice(1).join(" ").trim();
          return (
            <Fragment key={i}>
              <h3 style={{ margin: "18px 0 6px" }}>{lines[0].slice(3)}</h3>
              {rest && <p style={{ margin: "0 0 10px" }}>{inlineMd(rest)}</p>}
            </Fragment>
          );
        }
        if (lines.every((l) => /^[-*] /.test(l.trim()))) {
          return (
            <ul key={i} style={{ margin: "0 0 10px", paddingLeft: 20 }}>
              {lines.map((l, j) => (
                <li key={j}>{inlineMd(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ margin: "0 0 10px" }}>
            {inlineMd(block.replace(/\n/g, " "))}
          </p>
        );
      })}
    </div>
  );
}

function HandbookModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [doc, setDoc] = useState<HandbookContent | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setDoc(null);
    setFailed(false);
    fetch(`/api/handbook?doc=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (alive) setDoc(j);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

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
        style={{ maxWidth: 680, width: "100%", maxHeight: "calc(100vh - 80px)", overflowY: "auto", position: "relative" }}
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
        {failed && <p style={{ margin: 0 }}>Couldn&rsquo;t load this doc. Close and try again.</p>}
        {!failed && !doc && <p style={{ margin: 0, color: "var(--muted)" }}>Loading…</p>}
        {doc && (
          <>
            <h3 style={{ margin: "0 0 2px", paddingRight: 28 }}>{doc.title}</h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted)" }}>
              {doc.category && `${doc.category} · `}updated {doc.updated} · fictional handbook content
            </p>
            <MarkdownDoc text={doc.content} />
          </>
        )}
      </div>
    </div>
  );
}

function HandbookRail({
  citedTitles,
  onOpen,
}: {
  citedTitles: Set<string>;
  onOpen: (slug: string) => void;
}) {
  const [docs, setDocs] = useState<HandbookDoc[]>([]);
  useEffect(() => {
    fetch("/api/handbook")
      .then((r) => r.json())
      .then((j) => setDocs(j.docs ?? []))
      .catch(() => {});
  }, []);
  if (docs.length === 0) return null;
  return (
    <aside className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>The handbook</h3>
      <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--muted)" }}>
        The {docs.length} docs the assistant reads. Open any of them and compare with its answers.
      </p>
      <div style={{ display: "grid", gap: 6 }}>
        {docs.map((d) => {
          const cited = citedTitles.has(d.title);
          return (
            <button
              key={d.slug}
              onClick={() => onOpen(d.slug)}
              style={{
                textAlign: "left", cursor: "pointer", fontSize: 13, lineHeight: 1.4,
                padding: "7px 10px", borderRadius: "var(--radius)",
                border: `1px solid ${cited ? "var(--accent)" : "var(--border)"}`,
                background: cited ? "var(--accent-soft)" : "var(--bg)",
                color: "var(--ink)",
              }}
            >
              {d.title}
              {cited && (
                <span style={{ display: "block", fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                  cited in the last answer
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default function AssistantPage() {
  const { unlocked, promptUnlock } = useUnlock();
  const [suggested, setSuggested] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
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

  // Docs cited by the most recent sourced answer light up in the rail, so a
  // reader can jump straight from an answer to the doc it came from.
  const lastSourced = [...msgs].reverse().find((m) => m.role === "assistant" && m.sources?.length);
  const citedTitles = new Set((lastSourced?.sources ?? []).map((s) => s.docTitle));

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
    <section>
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
      <div className="assistant-grid">
        <div>
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
        </div>
        <HandbookRail citedTitles={citedTitles} onOpen={setOpenDoc} />
      </div>
      {openDoc && <HandbookModal slug={openDoc} onClose={() => setOpenDoc(null)} />}
    </section>
  );
}
