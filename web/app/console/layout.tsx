"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UnlockProvider, useUnlock } from "./UnlockContext";

const TABS = [
  { href: "/console/tracker", label: "Tracker" },
  { href: "/console/outbox", label: "Outbox" },
  { href: "/console/opsinbox", label: "Operator Inbox" },
  { href: "/console/health", label: "Health" },
  { href: "/console/assistant", label: "Assistant" },
];

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/138TahrgW_LzR5h1nIHXqdPtQNxi8jOeQcPeiQdOdO6w/edit";

// The ONLY place an access code is entered anywhere in the console. Other
// pages that need a code call promptUnlock() (via useUnlock()) to open and
// flash this form instead of collecting their own.
function UnlockChip() {
  const { unlocked, refresh, promptSignal } = useUnlock();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (promptSignal === 0) return; // skip the initial mount value
    setOpen(true);
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [promptSignal]);

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const c = code.trim();
    if (!c || busy) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        refresh();
        setCode("");
        setOpen(false);
      } else {
        setNote("That code didn't work.");
      }
    } catch {
      setNote("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (unlocked === null) return null;
  if (unlocked) return <span className="badge SENT">🔓 Unlocked</span>;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      style={{ position: "relative", fontSize: 13 }}
    >
      <summary
        style={{
          cursor: "pointer", color: "var(--muted)", listStyle: "none",
          userSelect: "none", whiteSpace: "nowrap",
        }}
      >
        🔒 Enter access code
      </summary>
      <form
        onSubmit={submit}
        className={flash ? "unlock-flash" : undefined}
        style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 10,
          display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
          borderRadius: "var(--radius)", border: "1px solid var(--border)",
          background: "var(--surface)", boxShadow: "0 4px 16px rgba(0,0,0,.1)",
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          autoFocus
          style={{
            width: 120, padding: "5px 8px", borderRadius: "var(--radius)",
            border: "1px solid var(--border)", fontSize: 13, background: "var(--bg)",
          }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "5px 10px", borderRadius: "var(--radius)", border: "none",
            background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}
        >
          Unlock
        </button>
        {note && <span style={{ color: "var(--error)", fontSize: 12, whiteSpace: "nowrap" }}>{note}</span>}
      </form>
    </details>
  );
}

function ConsoleChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="container" style={{ padding: "24px 24px 64px" }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
        <Link
          href="/"
          style={{
            textDecoration: "none", fontWeight: 600, color: "var(--accent-ink)",
            fontFamily: "var(--font-serif, Georgia), Georgia, serif", fontSize: 20,
          }}
        >
          Welcome Copilot
        </Link>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Ops console</span>
        <span className="badge neutral">Demo · fictional data</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <UnlockChip />
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            Open the shared Google Sheet ↗
          </a>
        </div>
      </header>
      <nav
        style={{
          display: "flex", flexWrap: "wrap", gap: 4,
          borderBottom: "1px solid var(--border)", marginBottom: 24,
        }}
      >
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "10px 16px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 15,
              whiteSpace: "nowrap",
              color: pathname.startsWith(t.href) ? "var(--accent)" : "var(--muted)",
              borderBottom: pathname.startsWith(t.href)
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnlockProvider>
      <ConsoleChrome>{children}</ConsoleChrome>
    </UnlockProvider>
  );
}
