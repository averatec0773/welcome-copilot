-- Utilization report: sessions, billed hours, and utilization % against a
-- 25h/week caseload target (25 * 4 weeks = 100h/month), per clinician per
-- month, plus the change from the prior month in this export.
--
-- Input: table `billing` (date, clinician_id, clinician, state, sessions,
-- billed_minutes, payer) loaded from the monthly CSV exports.

WITH roster AS (
  -- Hardcoded roster — the source of truth for "who's actually on the
  -- team," independent of whatever clinician_ids show up in an export.
  -- Anything in `billing` but not here (e.g. a mistyped or unknown id) is
  -- caught separately by the build script's validations, not silently
  -- folded into anyone's numbers here.
  SELECT 'C-001' AS clinician_id, 'Maria Chen'      AS clinician UNION ALL
  SELECT 'C-002',                 'James Okafor'                UNION ALL
  SELECT 'C-003',                 'Sarah Kim'                   UNION ALL
  SELECT 'C-004',                 'Priya Natarajan'             UNION ALL
  SELECT 'C-005',                 'Emily Tran'
),

monthly AS (
  -- One row per clinician per month: total sessions, total billed hours.
  SELECT
    r.clinician_id,
    r.clinician,
    substr(b.date, 1, 7)                     AS month,          -- 'YYYY-MM'
    SUM(b.sessions)                          AS sessions_total,
    ROUND(SUM(b.billed_minutes) / 60.0, 1)   AS hours
  FROM billing b
  JOIN roster r ON r.clinician_id = b.clinician_id
  GROUP BY r.clinician_id, r.clinician, month
),

scored AS (
  -- Utilization against the 100h/month target caseload.
  SELECT
    *,
    ROUND(hours / 100.0 * 100, 0) AS utilization_pct
  FROM monthly
)

SELECT
  s.clinician_id,
  s.clinician,
  s.month,
  s.sessions_total,
  s.hours,
  s.utilization_pct,
  -- Change vs. the same clinician's immediately prior month. NULL when
  -- there's no prior month in this export (every July row, or a clinician
  -- who only appears starting in August).
  CASE
    WHEN p.hours IS NULL OR p.hours = 0 THEN NULL
    ELSE ROUND((s.hours - p.hours) / p.hours * 100, 1)
  END AS mom_delta_pct
FROM scored s
LEFT JOIN scored p
  ON p.clinician_id = s.clinician_id
  AND p.month = strftime('%Y-%m', date(s.month || '-01', '-1 month'))
ORDER BY s.clinician_id, s.month;
