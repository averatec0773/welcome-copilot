// Welcome email template. Rendered once, stored in Outbox, then sent —
// so what we archive is exactly what went out.

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderWelcomeEmail(row, assistantUrl) {
  const firstName = escapeHtml(String(row.name).trim().split(/\s+/)[0]);
  const fullName = escapeHtml(row.name);
  const startDate = Utilities.formatDate(row.startDate, Session.getScriptTimeZone(), 'EEEE, MMMM d, yyyy');
  const manager = escapeHtml(row.manager || 'your manager');
  const state = escapeHtml(row.state || '');
  const license = escapeHtml(row.license || '');
  const subject = 'Welcome to Mentella, ' + firstName + '!';
  const html =
    '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2a26;line-height:1.6">' +
    '<h2 style="color:#4a6b5d">Welcome to Mentella Health, ' + firstName + '!</h2>' +
    '<p>We are thrilled to have you joining our clinical team' + (state ? ' in ' + state : '') + '. ' +
    'Your first day is <strong>' + startDate + '</strong>.</p>' +
    '<p>A few things to know before you start:</p>' +
    '<ul>' +
    '<li><strong>Your manager:</strong> ' + manager + ' will reach out this week to schedule your first check-in.</li>' +
    (license ? '<li><strong>Credentialing:</strong> we have your ' + license + ' on file and will confirm state paperwork before day one.</li>' : '') +
    '<li><strong>Questions?</strong> Our <a href="' + assistantUrl + '">New Therapist Assistant</a> answers the questions new hires ask most — scheduling, EHR access, payroll, PTO, and more.</li>' +
    '</ul>' +
    '<p>If anything here looks wrong, just reply to this email.</p>' +
    '<p>Warmly,<br>Mentella People Ops<br><span style="color:#8a857d;font-size:13px">people-ops@mentella.example</span></p>' +
    '</div>';
  return { subject: subject, html: html };
}
