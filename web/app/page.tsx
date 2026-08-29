import Link from "next/link";

const STEPS = [
  "HR marks a row “Hired”",
  "Apps Script trigger (every 5 min)",
  "Validate → render → archive to Outbox",
  "Send via Gmail (idempotent, at-most-once)",
  "Heartbeat to healthchecks.io",
];

const CARDS = [
  {
    title: "Reliable by design",
    body:
      "Idempotency, hire_id-keyed writes, at-most-once SENDING state, a quota guard, and a fail-closed dry-run — the pipeline never double-sends and never guesses.",
  },
  {
    title: "You’d know if it broke",
    body: "Three defenses: instant error alerts, a dead-man’s-switch, and a daily digest.",
    href: "/console/health",
    linkLabel: "See the health console →",
  },
  {
    title: "An assistant, not a search box",
    body: "Retrieval + Claude with citations and honest refusals — it answers from the handbook or says it doesn’t know.",
    href: "/console/assistant",
    linkLabel: "Ask it something →",
  },
];

export default function Home() {
  return (
    <main>
      <section className="container" style={{ padding: "96px 24px 48px", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 48,
            margin: "0 0 20px",
            lineHeight: 1.15,
          }}
        >
          Welcome Copilot
        </h1>
        <p style={{ fontSize: 18, color: "var(--muted)", maxWidth: 640, margin: "0 auto 32px" }}>
          From &ldquo;Hired&rdquo; in a shared spreadsheet to a personalized welcome email, an
          onboarding assistant, and an ops console &mdash; automatically, reliably, observably.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/console/tracker"
            style={{
              padding: "12px 22px", borderRadius: "var(--radius)", background: "var(--accent)",
              color: "#fff", fontWeight: 600, textDecoration: "none", fontSize: 15,
            }}
          >
            Open the Ops Console
          </Link>
          <a
            href="https://github.com/averatec0773/welcome-copilot"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "12px 22px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
              color: "var(--ink)", fontWeight: 600, textDecoration: "none", fontSize: 15,
            }}
          >
            View source on GitHub
          </a>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", maxWidth: 560, margin: "28px auto 0" }}>
          Unofficial demo built in response to Mentella Health&rsquo;s application task. All
          people, emails, and policies are fictional; recipient addresses are + aliases of the
          author&rsquo;s own inbox.
        </p>
      </section>

      <section className="container" style={{ padding: "48px 24px" }}>
        <h2 style={{ fontSize: 22, textAlign: "center", marginBottom: 24 }}>How it works</h2>
        <div
          style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12,
          }}
        >
          {STEPS.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                className="card"
                style={{ padding: "12px 16px", fontSize: 13.5, textAlign: "center", maxWidth: 200 }}
              >
                {step}
              </div>
              {i < STEPS.length - 1 && (
                <span style={{ color: "var(--muted)", fontSize: 18 }}>&rarr;</span>
              )}
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, marginTop: 20 }}>
          The spreadsheet stays the source of truth &mdash; the automation works around how the
          team already works.{" "}
          <a
            href="https://docs.google.com/spreadsheets/d/138TahrgW_LzR5h1nIHXqdPtQNxi8jOeQcPeiQdOdO6w/edit"
            target="_blank"
            rel="noopener noreferrer"
          >
            See the actual shared Google Sheet ↗
          </a>
        </p>
      </section>

      <section className="container" style={{ padding: "48px 24px 96px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {CARDS.map((c) => (
            <div key={c.title} className="card">
              <h3 style={{ fontSize: 17, margin: "0 0 10px" }}>{c.title}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", margin: c.href ? "0 0 12px" : 0 }}>
                {c.body}
              </p>
              {c.href && (
                <Link href={c.href} style={{ fontSize: 14, fontWeight: 600 }}>
                  {c.linkLabel}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          borderTop: "1px solid var(--border)", padding: "24px", textAlign: "center",
          fontSize: 13, color: "var(--muted)",
        }}
      >
        Built with Google Apps Script, Next.js, Claude, and a healthy fear of silent failures.{" "}
        <a href="https://github.com/averatec0773/welcome-copilot" target="_blank" rel="noreferrer">
          View source on GitHub
        </a>
      </footer>
    </main>
  );
}
