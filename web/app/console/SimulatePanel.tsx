"use client";
// Reusable "Simulate a hire" form + live panel. Used inside the Tracker
// page's modal (see tracker/page.tsx) — every behavior (status limits,
// POST flow, live polling with termination, sheet deep link, iframe
// preview, error mapping) lives here so the modal is a thin wrapper.
import { useEffect, useRef, useState } from "react";
import type { Hire, OutboxEmail } from "@/lib/sheets";
import { Explain } from "./Explain";
import { useUnlock } from "./UnlockContext";

type SimulateResult = { alias: string; name: string; row: number; sheetLink: string };
type SimulateStatus = {
  unlocked: boolean;
  ipRemaining: number | null;
  ipLimit: number;
  ipReset: number | null;
  globalRemaining: number | null;
  globalLimit: number;
  globalReset: number | null;
  windows: { ip: string; global: string };
};

const ERROR_MESSAGES: Record<string, string> = {
  locked: "This needs an access code. Enter it in the console header.",
  invalid_name: "Names use letters only (the first word is what gets greeted). Try something like Riley.",
  rate_limited: "Rate limited. Each visitor can simulate 10 times an hour, and the whole demo 3 times per 10 minutes. Try again in a bit.",
  limiter_unavailable: "The rate limiter is unavailable right now. Try again in a moment.",
  demo_backlog: "There are already several demo hires mid-pipeline. Give them a few minutes to finish, then retry.",
  dry_run_mode: "The pipeline is in dry-run rehearsal mode right now, so simulation is paused.",
  quota_low: "Today's mail quota is running low, so live sends are paused. Try again tomorrow.",
  sheet_unavailable: "Couldn't read the tracker sheet. Try again in a moment.",
  append_failed: "Couldn't append the row. Try again in a moment.",
};

function statusLine(s: SimulateStatus | null): string {
  if (!s) return "";
  if (s.ipRemaining === null || s.globalRemaining === null) {
    return `limits: ${s.ipLimit}/hour per visitor, ${s.globalLimit} per 10 minutes demo-wide`;
  }
  return `Your simulations: ${s.ipRemaining} of ${s.ipLimit} left this hour · demo-wide: ${s.globalRemaining} of ${s.globalLimit} left per 10 min`;
}

function resetNote(s: SimulateStatus | null): string {
  if (!s) return "";
  const resets = [s.ipReset, s.globalReset].filter((r): r is number => r !== null);
  if (resets.length === 0) return "";
  const soonest = Math.min(...resets);
  const mins = Math.ceil((soonest - Date.now()) / 60000);
  return mins > 0 ? ` (resets in ~${mins} min)` : "";
}

const MAX_POLL_ATTEMPTS = 90; // 90 × 4s ≈ 6 minutes

const EXPLAIN_PROPS = {
  title: "Trigger the real pipeline yourself",
  points: [
    "This appends a genuine row to the shared sheet, exactly like HR marking someone Hired, then triggers the pipeline immediately. No waiting for the 5-minute sweep.",
    "The pipeline validates the row, renders the email, archives it, then sends it. The email is usually out within thirty seconds.",
    "Watch every stage below, or open the sheet and see your row land.",
  ],
};

// Defensive only. The Tracker page's "Simulate a hire" button already gates
// on unlocked and calls promptUnlock() itself before this modal ever opens —
// this branch shouldn't render on the primary path, so it stays minimal and
// doesn't re-trigger promptUnlock() (the button already did).
function LockedPanel() {
  return (
    <section>
      <h2 style={{ marginBottom: 8 }}>Simulate a hire</h2>
      <p style={{ fontSize: 14, color: "var(--muted)" }}>
        This needs an access code. Enter it in the console header.
      </p>
    </section>
  );
}

export default function SimulatePanel() {
  const { unlocked } = useUnlock();
  const [firstName, setFirstName] = useState("");
  const [wantCopy, setWantCopy] = useState(false);
  const [visitorEmail, setVisitorEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [hire, setHire] = useState<Hire | null>(null);
  const [outboxEmail, setOutboxEmail] = useState<OutboxEmail | null>(null);
  // "polling" until a terminal outcome: the email lands (outboxEmail set),
  // the pipeline flags the row (INVALID/DUPLICATE), or the attempt cap trips.
  const [pollStatus, setPollStatus] = useState<"polling" | "timeout" | "flagged">("polling");
  const [simStatus, setSimStatus] = useState<SimulateStatus | null>(null);
  const attemptsRef = useRef(0);

  function refreshStatus() {
    fetch("/api/simulate")
      .then((r) => r.json())
      .then((j) => setSimStatus(j))
      .catch(() => {});
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  // Once a row is appended, poll the tracker for the alias's status, then once
  // it's SENT, poll the outbox for the archived email and stop. Also stops on
  // a terminal tracker status (INVALID/DUPLICATE — the guard did its job) or
  // after MAX_POLL_ATTEMPTS, so a stuck row never polls forever.
  useEffect(() => {
    if (!result || outboxEmail || pollStatus !== "polling") return;
    let alive = true;
    async function tick() {
      attemptsRef.current += 1;
      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        if (alive) setPollStatus("timeout");
        return;
      }
      try {
        // Cache-busting query: /api/tracker is CDN-cached for 30s, which is
        // fine for the passive console pages but would make this live status
        // lag half a minute behind the actual send.
        const tRes = await fetch(`/api/tracker?live=${Date.now()}`);
        const tJson = await tRes.json();
        const hires: Hire[] = tJson.hires ?? [];
        const found = hires.find((h) => h.email.toLowerCase() === result!.alias.toLowerCase());
        if (!alive) return;
        if (found) setHire(found);
        if (found?.welcomeStatus === "INVALID" || found?.welcomeStatus === "DUPLICATE") {
          setPollStatus("flagged");
          return;
        }
        if (found?.welcomeStatus === "SENT") {
          const oRes = await fetch(`/api/outbox?live=${Date.now()}`);
          const oJson = await oRes.json();
          const emails: OutboxEmail[] = oJson.emails ?? [];
          const email = emails.find((e) => e.to.toLowerCase() === result!.alias.toLowerCase());
          if (email && alive) setOutboxEmail(email);
        }
      } catch {
        /* transient — the next tick will retry, and still counts toward the cap */
      }
    }
    tick();
    const id = setInterval(tick, 4_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, outboxEmail, pollStatus]);

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          visitorEmail: wantCopy ? visitorEmail.trim() : undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(ERROR_MESSAGES[j.error] ?? "Something went wrong. Try again.");
      } else {
        setResult(j);
        setHire(null);
        setOutboxEmail(null);
        attemptsRef.current = 0;
        setPollStatus("polling");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
      refreshStatus();
    }
  }

  if (unlocked === null) return <p>Loading…</p>;
  if (!unlocked) return <LockedPanel />;

  return (
    <section>
      <h2 style={{ marginBottom: 8 }}>Simulate a hire</h2>
      <Explain {...EXPLAIN_PROPS} />
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
        The first name you type is recorded on the public shared sheet, so make one up rather
        than using a real one. The welcome email itself goes to a + alias of the
        author&rsquo;s own inbox, never to a stranger. Want to read it in your own inbox too?
        Tick the box below: in every public record your address is replaced by an alias, but
        the copy arrives in your real inbox. No list, no follow-up.
      </p>

      {!result && (
        <form onSubmit={submit} className="card" style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: 13, display: "grid", gap: 4 }}>
            First name (optional, make one up)
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Riley"
              maxLength={20}
              style={{
                padding: "8px 10px", borderRadius: "var(--radius)",
                border: "1px solid var(--border)", fontSize: 14,
              }}
            />
          </label>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={wantCopy} onChange={(e) => setWantCopy(e.target.checked)} />
            Send me the email too
          </label>
          {wantCopy && (
            <>
              <input
                type="email"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  padding: "8px 10px", borderRadius: "var(--radius)",
                  border: "1px solid var(--border)", fontSize: 14,
                }}
              />
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                Copies sometimes land in spam. Check there first.
              </p>
            </>
          )}
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "10px 16px", borderRadius: "var(--radius)", border: "none",
              background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 14,
              cursor: "pointer", justifySelf: "start",
            }}
          >
            {busy ? "Simulating…" : "Simulate a hire"}
          </button>
          {error && (
            <p style={{ color: "var(--error)", fontSize: 13, margin: 0 }}>
              {error}
              {error === ERROR_MESSAGES.rate_limited && resetNote(simStatus)}
            </p>
          )}
        </form>
      )}

      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>{statusLine(simStatus)}</p>

      {result && (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 14 }}>
            ✓ Row {result.row} appended for <strong>{result.name}</strong> ({result.alias}).{" "}
            <a href={result.sheetLink} target="_blank" rel="noopener noreferrer">
              See your row in the Google Sheet ↗
            </a>
          </div>
          <div style={{ fontSize: 14 }}>
            Status:{" "}
            {hire?.welcomeStatus ? (
              <span className={`badge ${hire.welcomeStatus}`}>{hire.welcomeStatus}</span>
            ) : (
              <span style={{ color: "var(--muted)" }}>pipeline triggered</span>
            )}
            {pollStatus === "polling" && !outboxEmail && (
              <span style={{ color: "var(--muted)", marginLeft: 8 }}>
                {hire?.welcomeStatus === "SENT"
                  ? "· sent, fetching the archived email…"
                  : hire?.welcomeStatus === "SENDING"
                    ? "· mid-send…"
                    : hire
                      ? "· row picked up, validating and rendering…"
                      : "· waiting for the pipeline to pick up the row (usually 10 to 30 seconds)…"}
              </span>
            )}
          </div>
          {pollStatus === "flagged" && hire?.welcomeStatus && (
            <p style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>
              The pipeline flagged this row as {hire.welcomeStatus}. That is the guard working
              as designed; see the Tracker.
            </p>
          )}
          {pollStatus === "timeout" && (
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Taking longer than expected. The immediate trigger may have failed; the 5-minute
              timer picks the row up in that case (a visitor copy may not arrive that way).
              Check the Tracker tab.
            </p>
          )}
          {outboxEmail && (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <iframe
                  sandbox=""
                  srcDoc={outboxEmail.bodyHtml}
                  title={`Email to ${outboxEmail.to}`}
                  style={{ width: "100%", height: 420, border: "none", background: "#fff" }}
                />
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                This is the exact email the pipeline just sent, on the same code path a real
                new hire gets. It is archived in the Outbox too.
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setResult(null);
              setHire(null);
              setOutboxEmail(null);
              setFirstName("");
              attemptsRef.current = 0;
              setPollStatus("polling");
            }}
            style={{
              justifySelf: "start", padding: "8px 14px", borderRadius: "var(--radius)",
              border: "1px solid var(--border)", background: "var(--bg)", fontSize: 13, cursor: "pointer",
            }}
          >
            Simulate another
          </button>
        </div>
      )}
    </section>
  );
}
