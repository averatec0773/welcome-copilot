// Minimal assertion runner for pure logic. Run runTests() in the editor;
// heavier framework deliberately skipped (see docs/design.md).

function runTests() {
  const results = [];
  function check(name, cond) { results.push((cond ? 'PASS' : 'FAIL') + ' - ' + name); }

  check('valid row passes', validateRow({ name: 'A B', email: 'a@b.com', startDate: new Date() }).ok === true);
  check('bad email fails', validateRow({ name: 'A B', email: 'a@', startDate: new Date() }).ok === false);
  check('missing name fails', validateRow({ name: ' ', email: 'a@b.com', startDate: new Date() }).ok === false);
  check('missing date fails', validateRow({ name: 'A', email: 'a@b.com', startDate: '' }).ok === false);
  check('email error is redacted', validateRow({ name: 'A', email: 'bad@', startDate: new Date() }).errors.join(' ').indexOf('bad@') === -1);

  const row = { name: 'Maria Chen', startDate: new Date(2026, 8, 15), state: 'CA', manager: 'Dana Whitfield', license: 'LMFT' };
  const msg = renderWelcomeEmail(row, 'https://example.com/assistant');
  check('subject greets by first name', msg.subject.indexOf('Maria') !== -1);
  check('html links assistant', msg.html.indexOf('https://example.com/assistant') !== -1);
  check('html mentions start date', msg.html.indexOf('September') !== -1);
  const xss = renderWelcomeEmail({ name: '<b>X</b>', startDate: new Date(), state: '', manager: '', license: '' }, 'u');
  check('html escapes user data', xss.html.indexOf('<b>X</b>') === -1);
  check('date renders English', formatStartDate(new Date(2026, 8, 15)) === 'Tuesday, September 15, 2026');

  Logger.log(results.join('\n'));
  const failed = results.filter(function (r) { return r.indexOf('FAIL') === 0; });
  Logger.log(failed.length ? failed.length + ' TEST(S) FAILED' : 'ALL ' + results.length + ' TESTS PASSED');
}
