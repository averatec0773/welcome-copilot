import Link from "next/link";

const PIPELINE_STAGES = ["validate", "render", "archive", "send", "SENT written back"];

const WATCHDOGS = [
  { label: "Instant alerts", where: "Operator Inbox", href: "/console/opsinbox" },
  { label: "Dead man's switch", where: "Health", href: "/console/health" },
  { label: "Daily digest", where: "Operator Inbox", href: "/console/opsinbox" },
];

function LaneLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--terra-ink)",
      }}
    >
      {children}
    </p>
  );
}

function StageChip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      style={{
        padding: "6px 12px", borderRadius: 999, border: "1px solid var(--border)",
        background: "var(--surface)", fontSize: 13.5, whiteSpace: "nowrap",
        fontWeight: strong ? 700 : 400,
      }}
    >
      {children}
    </span>
  );
}

function DownArrow() {
  return (
    <div aria-hidden style={{ textAlign: "center", color: "var(--muted)", fontSize: 18, lineHeight: 1, margin: "8px 0" }}>
      ↓
    </div>
  );
}

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
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="card" style={{ padding: "16px 20px" }}>
            <LaneLabel>1 · The team</LaneLabel>
            <p style={{ margin: "0 0 10px", fontSize: 15 }}>
              HR marks a row &ldquo;Hired&rdquo; in the shared Google Sheet, the same tracker
              the team already edits. The sheet stays the source of truth; nobody learns a new
              tool.
            </p>
            <a
              href="https://docs.google.com/spreadsheets/d/138TahrgW_LzR5h1nIHXqdPtQNxi8jOeQcPeiQdOdO6w/edit"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13.5, fontWeight: 600 }}
            >
              Open the actual shared sheet ↗
            </a>
          </div>
          <DownArrow />
          <div className="card" style={{ padding: "16px 20px" }}>
            <LaneLabel>2 · The pipeline, every 5 minutes</LaneLabel>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {/* The arrow LEADS its chip: a wrapped chip carries its arrow to
                  the new line, so no row ends with an arrow pointing at nothing. */}
              {PIPELINE_STAGES.map((s, i) => (
                <span key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {i > 0 && (
                    <span className="hide-sm" style={{ color: "var(--muted)" }}>&rarr;</span>
                  )}
                  <StageChip strong={i === PIPELINE_STAGES.length - 1}>{s}</StageChip>
                </span>
              ))}
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 13.5, color: "var(--muted)" }}>
              Bad data becomes <span className="badge INVALID">INVALID</span>, the same person
              twice becomes <span className="badge DUPLICATE">DUPLICATE</span>. Neither sends an
              email.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 13.5, fontWeight: 600 }}>
              <Link href="/console/tracker">Watch it live in the Tracker →</Link>
              <span style={{ color: "var(--muted)", fontWeight: 400 }}> · </span>
              <Link href="/console/outbox">Read every email in the Outbox →</Link>
            </p>
          </div>
          <DownArrow />
          <div className="card" style={{ padding: "16px 20px", background: "var(--accent-soft)" }}>
            <LaneLabel>3 · The watchdogs</LaneLabel>
            <p style={{ margin: "0 0 10px", fontSize: 15 }}>
              If everything above goes silent, this layer notices and emails a human.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {WATCHDOGS.map((w) => (
                <Link
                  key={`${w.label}-${w.href}`}
                  href={w.href}
                  style={{
                    padding: "6px 12px", borderRadius: 999, border: "1px solid var(--accent)",
                    background: "var(--surface)", fontSize: 13.5, fontWeight: 600,
                    color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  {w.label} · {w.where}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 15, marginTop: 24 }}>
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
        </a>{" "}
        ·{" "}
        <a href="/walkthrough.pdf" target="_blank" rel="noreferrer">
          Read the walkthrough (PDF)
        </a>
      </footer>
    </main>
  );
}
