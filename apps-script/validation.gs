// Row validation. A row must be complete and sane before we email a real address.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRow(row) {
  const errors = [];
  if (!row.name || !String(row.name).trim()) errors.push('missing name');
  if (!row.email || !EMAIL_RE.test(row.email)) errors.push('invalid email: "' + row.email + '"');
  if (!row.startDate || !(row.startDate instanceof Date)) errors.push('missing or invalid start_date');
  return { ok: errors.length === 0, errors: errors };
}
