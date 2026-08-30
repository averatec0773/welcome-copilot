// Welcome email template. Rendered once, stored in Outbox, then sent —
// so what we archive is exactly what went out.

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Always renders English regardless of script/spreadsheet locale (public-content constraint).
function formatStartDate(d) {
  return WEEKDAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function renderWelcomeEmail(row, assistantUrl) {
  const firstName = escapeHtml(String(row.name).trim().split(/\s+/)[0]);
  const startDate = formatStartDate(row.startDate);
  const manager = escapeHtml(row.manager || 'your manager');
  const state = escapeHtml(row.state || '');
  const license = escapeHtml(row.license || '');
  const subject = 'Welcome to Mentella, ' + firstName + '!';
  const html =
    '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#253129;line-height:1.6">' +
    '<h2 style="color:#1f4835">Welcome to Mentella Health, ' + firstName + '!</h2>' +
    '<p>We are thrilled to have you joining our clinical team' + (state ? ' in ' + state : '') + '. ' +
    'Your first day is <strong>' + startDate + '</strong>.</p>' +
    '<p>A few things to know before you start:</p>' +
    '<ul>' +
    '<li><strong>Your manager:</strong> ' + manager + ' will reach out this week to schedule your first check-in.</li>' +
    (license ? '<li><strong>Credentialing:</strong> we have your ' + license + ' on file and will confirm state paperwork before day one.</li>' : '') +
    '<li><strong>Questions?</strong> Our <a href="' + escapeHtml(assistantUrl) + '">New Therapist Assistant</a> answers the questions new hires ask most: scheduling, EHR access, payroll, PTO, and more.</li>' +
    '</ul>' +
    '<p>If anything here looks wrong, just reply to this email.</p>' +
    '<p>Warmly,<br>Mentella People Ops<br><span style="color:#5f6c62;font-size:13px">people-ops@mentella.example</span></p>' +
    '</div>';
  return { subject: subject, html: html };
}
