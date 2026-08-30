import utilization from "@/content/utilization.json";

type Row = {
  clinicianId: string;
  clinician: string;
  month: string;
  sessionsTotal: number;
  hours: number;
  utilizationPct: number;
  momDeltaPct: number | null;
};

type Validation = { check: string; status: "pass" | "warn"; detail: string };

const DATA = utilization as {
  generatedAt: string;
  months: string[];
  validations: Validation[];
  rows: Row[];
  sqlText: string;
};

const MONTH_LABEL: Record<string, string> = { "2026-07": "Jul 2026", "2026-08": "Aug 2026" };

function monthLabel(m: string): string {
  return MONTH_LABEL[m] ?? m;
}

function ValidationBanner({ validations }: { validations: Validation[] }) {
  const warnings = validations.filter((v) => v.status === "warn");
  const ok = warnings.length === 0;
  return (
    <div
      className="card"
      style={{
        borderColor: ok ? undefined : "var(--drafted)",
        background: ok ? "#e5f4ec" : "#fdf1e3",
      }}
    >
      <div style={{ fontWeight: 700, color: ok ? "var(--sent)" : "var(--drafted)" }}>
        {ok ? "All validation checks passed" : `${warnings.length} validation warning(s) — export loaded anyway, flagged for review`}
      </div>
      <ul style={{ margin: "10px 0 0", padding: "0 0 0 18px", fontSize: 13 }}>
        {validations.map((v) => (
          <li key={v.check} style={{ marginBottom: 4 }}>
            <span style={{ color: v.status === "pass" ? "var(--sent)" : "var(--drafted)" }}>
              {v.status === "pass" ? "✓" : "⚠"}
            </span>{" "}
            <strong>{v.check}:</strong> <span style={{ color: "var(--muted)" }}>{v.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const over = pct > 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            background: over ? "var(--error)" : "var(--accent)",
          }}
        />
      </div>
      <span style={{ fontSize: 12, color: "var(--muted)", width: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function MomDelta({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ color: "var(--muted)" }}>—</span>;
  const up = pct > 0;
  const flat = pct === 0;
  const color = flat ? "var(--muted)" : up ? "var(--sent)" : "var(--error)";
  const arrow = flat ? "→" : up ? "▲" : "▼";
  return (
    <span style={{ color, fontWeight: 600 }}>
      {arrow} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// Grouped bar chart, hours per clinician per month — inline SVG, no client
// JS or charting library. Two bars (muted = earlier month, accent = later
// month) per clinician group.
function UtilizationChart({ rows, months }: { rows: Row[]; months: string[] }) {
  const byClinicianId: string[] = [...new Set(rows.map((r) => r.clinicianId))];
  const clinicianName = (id: string) => rows.find((r) => r.clinicianId === id)?.clinician ?? id;
  const hoursFor = (id: string, month: string) => rows.find((r) => r.clinicianId === id && r.month === month)?.hours ?? 0;

  const width = 640;
  const height = 320;
  const margin = { top: 24, right: 16, bottom: 56, left: 44 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const maxHours = Math.max(100, ...rows.map((r) => r.hours)); // 100h = target line, always visible
  const yTicks = [0, 25, 50, 75, 100, Math.ceil(maxHours / 25) * 25].filter((v, i, a) => a.indexOf(v) === i && v <= Math.ceil(maxHours / 25) * 25);
  const yScale = (v: number) => plotH - (v / (Math.ceil(maxHours / 25) * 25)) * plotH;

  const groupW = plotW / byClinicianId.length;
  const barW = Math.min(28, groupW / (months.length + 1.5));
  const colors = ["var(--muted)", "var(--accent)"];

  const targetY = yScale(100);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Billed hours per clinician, by month">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Y axis grid + labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={0} x2={plotW} y1={yScale(t)} y2={yScale(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={-8} y={yScale(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted)">
              {t}
            </text>
          </g>
        ))}
        {/* 100h/month target reference line */}
        <line x1={0} x2={plotW} y1={targetY} y2={targetY} stroke="var(--error)" strokeDasharray="4 3" strokeWidth={1} />
        <text x={plotW} y={targetY - 6} textAnchor="end" fontSize={10} fill="var(--error)">
          100h target
        </text>

        {/* Bars */}
        {byClinicianId.map((id, gi) => {
          const groupX = gi * groupW + (groupW - barW * months.length) / 2;
          return (
            <g key={id}>
              {months.map((m, mi) => {
                const h = hoursFor(id, m);
                const barH = plotH - yScale(h);
                const x = groupX + mi * barW;
                return (
                  <rect
                    key={m}
                    x={x}
                    y={yScale(h)}
                    width={barW - 3}
                    height={Math.max(0, barH)}
                    fill={colors[mi % colors.length]}
                    rx={2}
                  />
                );
              })}
              <text
                x={gi * groupW + groupW / 2}
                y={plotH + 18}
                textAnchor="middle"
                fontSize={11}
                fill="var(--ink)"
              >
                {clinicianName(id).split(" ")[0]}
              </text>
              <text
                x={gi * groupW + groupW / 2}
                y={plotH + 32}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted)"
              >
                {id}
              </text>
            </g>
          );
        })}

        {/* Axis lines */}
        <line x1={0} x2={0} y1={0} y2={plotH} stroke="var(--border)" strokeWidth={1} />
        <line x1={0} x2={plotW} y1={plotH} y2={plotH} stroke="var(--border)" strokeWidth={1} />
      </g>

      {/* Legend */}
      <g transform={`translate(${margin.left}, ${height - 14})`}>
        {months.map((m, mi) => (
          <g key={m} transform={`translate(${mi * 100}, 0)`}>
            <rect width={10} height={10} y={-9} fill={colors[mi % colors.length]} rx={2} />
            <text x={16} y={0} fontSize={11} fill="var(--muted)">
              {monthLabel(m)}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export default function UtilizationPage() {
  const { months, validations, rows, sqlText, generatedAt } = DATA;

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: 720 }}>
        Several core clinical and billing systems expose no API. This slice treats a
        scheduled manual CSV export as the interface: validate loudly, then report.
        Built at deploy time from {monthLabel(months[0])} and {monthLabel(months[months.length - 1])}{" "}
        mock billing exports ({generatedAt}) — zero runtime cost, nothing recomputed on request.
      </p>

      <ValidationBanner validations={validations} />

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Billed hours vs. 25h/week target caseload</div>
        <UtilizationChart rows={rows} months={months} />
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data">
          <thead>
            <tr>
              <th>Clinician</th>
              <th>Month</th>
              <th>Sessions</th>
              <th>Hours</th>
              <th>Utilization</th>
              <th>MoM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.clinicianId}-${r.month}`}>
                <td>
                  {r.clinician} <span style={{ color: "var(--muted)", fontSize: 12 }}>{r.clinicianId}</span>
                </td>
                <td>{monthLabel(r.month)}</td>
                <td>{r.sessionsTotal}</td>
                <td>{r.hours.toFixed(1)}</td>
                <td>
                  <UtilizationBar pct={r.utilizationPct} />
                </td>
                <td>
                  <MomDelta pct={r.momDeltaPct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>The query behind the report</div>
        <pre
          style={{
            margin: 0,
            padding: 14,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 12.5,
            lineHeight: 1.5,
            overflowX: "auto",
            whiteSpace: "pre",
          }}
        >
          {sqlText}
        </pre>
      </div>
    </section>
  );
}
