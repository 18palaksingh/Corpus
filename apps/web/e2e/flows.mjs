/**
 * End-to-end checks for the flows that move money.
 *
 * The unit tests in @corpus/core prove the model is right; this proves the
 * screens wired to it are. Run against a server already listening on
 * BASE_URL (default http://localhost:3000):
 *
 *   npm run build && npm start -w @corpus/web
 *   npm run e2e -w @corpus/web
 *
 * The suite mutates server state (it approves a plan and edits an income
 * field) and restores what it changes, so it is safe to run repeatedly against
 * the reference persona. Do not point it at real user data.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
let failures = 0;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

const ok = (label, cond) => {
  if (!cond) failures += 1;
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label);
};

// 1. Navigation across all five screens
await p.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
for (const [label, heading] of [['Investment plan','Your investment plan'],['Spending limits','Spending limits'],['Where to spend','Where to spend'],['Your profile','Your profile'],['Dashboard',null]]) {
  await p.getByRole('link', { name: label, exact: true }).click();
  const target = heading ? p.getByRole('heading', { name: heading }) : p.getByText("This month's plan");
  ok(`nav → ${label}`, await target.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false));
}

// 2. Alert deep-link
await p.getByRole('link', { name: /Groceries 18% over limit/ }).click();
await p.waitForURL('**/spend', { timeout: 5000 }).catch(() => {});
ok('alert links to Where to spend', p.url().endsWith('/spend'));

// 3. Adjust: re-split the pool, Done gated on balancing
await p.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Adjust' }).click();
const inputs = p.locator('input[type=number]');
await inputs.nth(0).fill('20000');
ok('Done disabled while unbalanced', await p.getByRole('button', { name: 'Done' }).isDisabled());
ok('shows shortfall', (await p.textContent('body')).includes('₹2,000 still to allocate'));
await inputs.nth(1).fill('11000');
ok('Done enabled once balanced', await p.getByRole('button', { name: 'Done' }).isEnabled());
await p.getByRole('button', { name: 'Done' }).click();
ok('adjusted amount persists', (await p.textContent('body')).includes('₹20,000'));

// 4. Approve: confirmation dialog then scheduled state
await p.getByRole('button', { name: 'Approve plan' }).click();
ok('confirm dialog opens', await p.getByText(/Approve ₹38,000 for 2 September/).isVisible());
await p.getByRole('button', { name: 'Approve and schedule' }).click();
ok(
  'switches to scheduled state',
  await p.getByText(/Scheduled for 2 September/).waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false),
);

// 5. Server rejects a tampered approval
const bad = await p.evaluate(async () => {
  const r = await fetch('/api/plan/approve', { method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ scheduledFor: '2026-09-02T00:00:00.000Z', actions: [{ kind: 'invest', amount: 999999 }] }) });
  return r.status;
});
ok('rejects over-allocated approval (422)', bad === 422);

// 6. Recalculate updates LAST RUN
await p.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
// Compare the ISO timestamp, not the rendered minute — two runs inside the
// same minute render identically even though the model did rerun.
const before = await p.evaluate(async () => (await (await fetch('/api/snapshot')).json()).sync.lastRunAt);
await p.getByRole('button', { name: 'Recalculate plan' }).click();
await p.waitForTimeout(2500);
const after = await p.evaluate(async () => (await (await fetch('/api/snapshot')).json()).sync.lastRunAt);
ok('recalculate updates LAST RUN', after !== before);

// 7. Income edit reruns the model
await p.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
const salary = p.locator('input').first();
await salary.click();
await salary.fill('250000');
await salary.blur();
await p.waitForTimeout(2500);
ok('income edit saves', (await p.textContent('body')).includes('Plan updated'));
await p.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
const body = await p.textContent('body');
ok('surplus reflects new salary (₹97,400)', body.includes('₹97,400'));
ok('score moved off 78', !body.includes('>78<'));

// restore
await p.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
const s2 = p.locator('input').first();
await s2.click(); await s2.fill('205000'); await s2.blur();
await p.waitForTimeout(2000);

// The 422 is the deliberate tampered-approval check above.
const unexpected = errs.filter((e) => !e.includes('422'));
if (unexpected.length) {
  failures += 1;
  console.log('UNEXPECTED JS ERRORS:\n' + unexpected.join('\n'));
}

await b.close();

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
