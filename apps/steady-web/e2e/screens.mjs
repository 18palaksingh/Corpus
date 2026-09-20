/**
 * Drives the real UI in a browser and writes one screenshot per screen.
 *
 * This is a smoke test with a visual artefact, not a visual-regression suite:
 * it fails if a page errors, renders empty, or loses a piece of copy the
 * product is not allowed to lose — most importantly the crisis number and the
 * not-a-diagnosis line, which are promises rather than decoration.
 *
 *   npm run screens -w @steady/web        # server must be running with STEADY_DEMO=1
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.STEADY_BASE_URL ?? 'http://localhost:3100';
const OUT = process.env.STEADY_SHOTS ?? 'screenshots';

/** Phone-sized, because every prototype in the deck is a phone screen. */
const VIEWPORT = { width: 420, height: 900 };

let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  // Honour a pinned Chromium when the environment provides one whose build
  // does not match this Playwright's expectation (CI images and sandboxes
  // often do). Falls back to Playwright's own download everywhere else.
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  // -- Sign-in -------------------------------------------------------------
  console.log('signin');
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/01-signin.png`, fullPage: true });

  const signinText = await page.textContent('body');
  check('anonymous is the primary action', signinText.includes('Start anonymously'));
  check('the crisis line is on the sign-in screen', signinText.includes('14416'));
  check('the not-a-diagnosis line is present', signinText.includes('not a diagnosis'));

  // -- Into the demo account ----------------------------------------------
  console.log('\ntoday');
  await page.getByRole('button', { name: /Open the demo account/i }).click();
  await page.waitForURL('**/today', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/02-today.png`, fullPage: true });

  const todayText = await page.textContent('body');
  check('the home screen greets the seeded user', /Good (morning|afternoon|evening), Ananya/.test(todayText));
  check('a band is shown', /Amber|Red|Green|Not yet/.test(todayText));
  check('with one sentence of evidence', /of \d+ days|Steady across/.test(todayText));
  check('and a suggested action', todayText.includes('Suggested for you'));
  check('no raw score leaks to the screen', !/\b\d{1,3}\s*\/\s*100\b/.test(todayText));

  // -- The check-in --------------------------------------------------------
  console.log('\npulse');
  await page.goto(`${BASE}/pulse`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/03-pulse.png`, fullPage: true });
  const pulseText = await page.textContent('body');
  check('the pulse asks about energy first', pulseText.includes("How's your energy today?"));
  check('the privacy promise is on the check-in', pulseText.includes('Only you see them'));

  // Tapping a scale advances the step.
  await page.getByRole('button', { name: '2', exact: true }).first().click();
  await page.waitForTimeout(200);
  check('answering advances to step 2', (await page.textContent('body')).includes('2 of 3'));
  await page.screenshot({ path: `${OUT}/04-pulse-step2.png`, fullPage: true });

  // -- The Unfreezer -------------------------------------------------------
  console.log('\nunfreezer');
  await page.goto(`${BASE}/unfreeze`, { waitUntil: 'networkidle' });
  await page.fill('#task', 'Build the IRR summary for Fund III for the Friday client call');
  await page.getByRole('button', { name: /Get my first step/i }).click();
  await page.waitForSelector('text=Your first 3 steps', { timeout: 15_000 });
  await page.screenshot({ path: `${OUT}/05-unfreeze.png`, fullPage: true });

  const unfreezeText = await page.textContent('body');
  check('three steps are rendered', unfreezeText.includes('Your first 3 steps'));
  check('the first step names the task', unfreezeText.includes('IRR summary'));
  check('manager questions are rendered', unfreezeText.includes('Ask your manager'));
  check('the timer is offered', /Start 10-minute timer/.test(unfreezeText));
  check('the no-advice guardrail is stated', unfreezeText.includes('does not give medical'));

  // -- The crisis surface, in the real UI ----------------------------------
  console.log('\ncrisis');
  await page.goto(`${BASE}/unfreeze`, { waitUntil: 'networkidle' });
  await page.fill('#task', 'I have been thinking about suicide for weeks');
  await page.getByRole('button', { name: /Get my first step/i }).click();
  await page.waitForSelector('text=Talk to someone now', { timeout: 15_000 });
  await page.screenshot({ path: `${OUT}/06-crisis.png`, fullPage: true });

  const crisisText = await page.textContent('body');
  check('the crisis surface replaces the screen', crisisText.includes('Talk to someone now'));
  check('the helpline is one tap', crisisText.includes('14416'));
  check('no task plan is rendered alongside it', !crisisText.includes('Your first 3 steps'));
  check('the product disclaims being the help', crisisText.includes('not a crisis service'));

  // -- The reset -----------------------------------------------------------
  console.log('\nreset');
  await page.goto(`${BASE}/reset`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/07-reset.png`, fullPage: true });
  const resetText = await page.textContent('body');
  check('the reset shows the breathing pattern', resetText.includes('In for 4, out for 6'));
  check('and a way out from the first second', resetText.includes('Skip to task'));

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/08-reset-running.png`, fullPage: true });
  check('it counts down once started', /Breathe in slowly|In…/.test(await page.textContent('body')));

  // -- The week ------------------------------------------------------------
  console.log('\nweek');
  await page.goto(`${BASE}/week`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/09-week.png`, fullPage: true });
  const weekText = await page.textContent('body');
  check('the weekly insight renders', weekText.includes('Your week, in brief'));
  check('the seeded pattern is found', weekText.includes('Pattern we noticed'));
  check('wins are listed', weekText.includes('Started the IRR model early'));
  check('one experiment is offered', weekText.includes('Try this next week'));
  check('no streak mechanic is shown', !/streak/i.test(weekText));

  // -- Care ----------------------------------------------------------------
  console.log('\ncare');
  await page.goto(`${BASE}/care`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/10-care.png`, fullPage: true });
  const careText = await page.textContent('body');
  check('the crisis line is first on the care screen', careText.includes('Need help right now?'));
  check('all three care routes are offered', /therapist/i.test(careText) && /doctor/i.test(careText) && /peer circle/i.test(careText));
  check('placeholder partners are labelled as such', careText.includes('placeholder'));
  check('the commission is disclosed', careText.includes('commission'));

  // -- Profile -------------------------------------------------------------
  console.log('\nprofile');
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/11-profile.png`, fullPage: true });
  const profileText = await page.textContent('body');
  check('the employer promise is stated on the account screen', /No employer, manager or HR team can see/.test(profileText));
  check('erasure is offered', profileText.includes('Delete my account'));
  check('pairing a phone is offered', profileText.includes('pairing code'));

  // -- Desktop -------------------------------------------------------------
  console.log('\ndesktop');
  const wide = await context.newPage();
  await wide.setViewportSize({ width: 1280, height: 900 });
  await wide.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
  await wide.screenshot({ path: `${OUT}/12-today-desktop.png`, fullPage: true });
  check('the sidebar appears on a wide viewport', (await wide.textContent('body')).includes('Signed in as'));

  // -- No console errors anywhere -----------------------------------------
  console.log('\nconsole');
  // Ignored, with reasons — everything else is a real failure:
  //   - ERR_CERT_AUTHORITY_INVALID: sandboxes and CI runners that intercept
  //     TLS have their own CA, which this Chromium does not trust. It only
  //     ever affects the Google Fonts stylesheet, and the app is readable in
  //     the fallback stack without it.
  //   - React DevTools: an informational notice, not an error.
  const ignorable = /ERR_CERT_AUTHORITY_INVALID|Download the React DevTools/i;
  const real = consoleErrors.filter((e) => !ignorable.test(e));
  check('no page errors across the whole walk', real.length === 0, real.slice(0, 3).join(' | '));

  await browser.close();

  console.log(`\nScreenshots written to ${OUT}/`);
  if (failed > 0) {
    console.error(`${failed} check(s) failed`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('screens run failed:', error);
  process.exit(1);
});
