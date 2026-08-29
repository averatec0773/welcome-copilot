"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/console/tracker", label: "Tracker" },
  { href: "/console/outbox", label: "Outbox" },
  { href: "/console/health", label: "Health" },
  { href: "/console/assistant", label: "Assistant" },
];

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/138TahrgW_LzR5h1nIHXqdPtQNxi8jOeQcPeiQdOdO6w/edit";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="container" style={{ padding: "24px 24px 64px" }}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 700, color: "var(--ink)" }}>
          Welcome Copilot
        </Link>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Ops Console — read-only</span>
        <a
          href={SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600 }}
        >
          Open the shared Google Sheet ↗
        </a>
      </header>
      <nav style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "10px 16px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
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
