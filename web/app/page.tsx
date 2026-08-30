import Link from "next/link";

const STEPS = [
  "HR marks a row “Hired”",
  "A trigger fires within 5 min",
  "Validate the row, render the email",
  "Archive it, then send it",
  "A heartbeat confirms the run",
];

const CARDS = [
  {
    title: "It never sends twice",
    body:
      "The sheet itself records every send, keyed by hire ID rather than row position. A row that has sent once will not send again, even if someone re-sorts the sheet mid-run.",
  },
  {
    title: "Failure is loud",
    body:
      "Three separate alarms: instant error emails, a dead-man's switch that notices silence, and a daily digest. A quiet inbox plus a green badge means genuinely healthy.",
    href: "/console/health",
    linkLabel: "See the health page",
  },
  {
    title: "An assistant that cites its sources",
    body:
      "It answers from the onboarding handbook and shows where each answer came from. If the handbook doesn't cover something, it says so.",
    href: "/console/assistant",
    linkLabel: "Ask it something",
  },
];

export default function Home() {
  return (
    <main>
      <section style={{ background: "var(--accent-soft)", borderBottom: "1px solid var(--border)" }}>
        <div className="container" style={{ padding: "88px 24px 64px", textAlign: "center" }}>
          <p className="eyebrow" style={{ margin: "0 0 16px" }}>
            Built for Mentella Health&rsquo;s application task
          </p>
          <h1 style={{ fontSize: 52, margin: "0 0 20px", lineHeight: 1.1 }}>Welcome Copilot</h1>
          <p style={{ fontSize: 19, color: "var(--ink)", maxWidth: 620, margin: "0 auto 32px" }}>
            HR tracks hiring in a shared Google Sheet. When a row turns
            &ldquo;Hired&rdquo;, this system sends the welcome email, keeps proof of every send,
            and alerts a human the moment anything stops working. The sheet, the emails, and
            the health signals on this site are read live.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/console/tracker"
              style={{
                padding: "12px 22px", borderRadius: "var(--radius)", background: "var(--accent)",
                color: "#fff", fontWeight: 600, textDecoration: "none", fontSize: 15,
              }}
            >
              Open the console
            </Link>
            <a
              href="https://github.com/averatec0773/welcome-copilot"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "12px 22px", borderRadius: "var(--radius)", border: "1px solid var(--accent)",
                background: "var(--surface)", color: "var(--accent)", fontWeight: 600,
                textDecoration: "none", fontSize: 15,
              }}
            >
              View the source
            </a>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 560, margin: "28px auto 0" }}>
            An unofficial demo. All people and policies are fictional, and every recipient
            address is a + alias of the author&rsquo;s own inbox.
          </p>
        </div>
      </section>

      <section className="container" style={{ padding: "56px 24px" }}>
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>How it works</h2>
        <div
          style={{
            display: "flex", flexWrap: "wrap", alignItems: "stretch", justifyContent: "center", gap: 12,
          }}
        >
          {/* The arrow LEADS its step rather than trailing it. When the strip
              wraps, a wrapped step carries its arrow down to the new line,
              so no row ever ends with an arrow pointing at nothing. */}
          {STEPS.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
              {i > 0 && (
                <span
                  className="hide-sm"
                  style={{ color: "var(--muted)", fontSize: 18, alignSelf: "center" }}
                >
                  &rarr;
                </span>
              )}
              <div
                className="card"
                style={{
                  padding: "12px 14px", fontSize: 13.5, textAlign: "center", maxWidth: 170,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {step}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 15, marginTop: 24 }}>
          The spreadsheet stays the source of truth. The automation fits around how the team
          already works.{" "}
          <a
            href="https://docs.google.com/spreadsheets/d/138TahrgW_LzR5h1nIHXqdPtQNxi8jOeQcPeiQdOdO6w/edit"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the actual shared Google Sheet ↗
          </a>
        </p>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 15, marginTop: 8 }}>
          To watch it run end to end, open the Tracker and press{" "}
          <strong>▶ Simulate a hire</strong> (access code required). It appends a real row, and a
          real email goes out.
        </p>
      </section>

      <section className="container" style={{ padding: "24px 24px 88px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {CARDS.map((c) => (
            <div key={c.title} className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 20, margin: "0 0 10px" }}>{c.title}</h3>
              <p style={{ fontSize: 15, color: "var(--muted)", margin: c.href ? "0 0 12px" : 0 }}>
                {c.body}
              </p>
              {c.href && (
                <Link href={c.href} style={{ fontSize: 14, fontWeight: 600 }}>
                  {c.linkLabel} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          borderTop: "1px solid var(--border)", padding: "24px", textAlign: "center",
          fontSize: 13, color: "var(--muted)", background: "var(--surface)",
        }}
      >
        Built with Google Apps Script, Next.js, Claude, and a healthy fear of silent failures.{" "}
        <a href="https://github.com/averatec0773/welcome-copilot" target="_blank" rel="noreferrer">
          View the source on GitHub
        </a>
      </footer>
    </main>
  );
}
