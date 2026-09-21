/**
 * Drives the mobile app in a browser, against a real Steady server.
 *
 * ## Why this exists
 *
 * An emulator is not always available — CI runners, review environments and
 * sandboxes frequently have no Android SDK at all. But Expo can export the
 * *same* React Native source through react-native-web, and that export
 * exercises the real screens, the real navigation and the real API client in
 * `lib/api.ts`. What it does not exercise is the native shell: gestures,
 * permissions, the splash screen, and anything platform-specific.
 *
 * So: this is a genuine integration check of the app's logic and flows, and it
 * is **not** a substitute for installing the APK on a phone once. Treat a pass
 * here as "the app works"; treat the APK as "the app works on Android".
 *
 * ## Running it
 *
 *   # 1. a Steady server, allowing this origin
 *   STEADY_DEMO=1 STEADY_ALLOWED_ORIGINS=http://localhost:8099 \
 *     npm start -w @steady/web
 *
 *   # 2. the app, exported and served
 *   STEADY_API_BASE_URL=http://localhost:3100 \
 *     npx expo export --platform web --output-dir /tmp/steady-app
 *   npx http-server /tmp/steady-app -p 8099 --cors -s
 *
 *   # 3. this
 *   node apps/steady-mobile/e2e/drive.mjs
 *
 * `playwright` resolves from the repo root, where it is already a dependency.
 */
import { chromium } from 'playwright';

const APP = process.env.STEADY_APP_URL ?? 'http://localhost:8099';
const SHOTS = process.env.STEADY_SHOTS ?? '/tmp/steady-mobile-shots';

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
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  // Phone-sized: every prototype in the pitch deck is a phone screen.
  const context = await browser.newContext({ viewport: { width: 400, height: 860 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  // -- First launch --------------------------------------------------------
  console.log('first launch');
  await page.goto(APP, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  let text = await page.textContent('body');
  check('the app launches straight into the product', /Good (morning|afternoon|evening)/.test(text), text.slice(0, 140));
  check('with no sign-in wall — it signed itself up', !/sign in|log in/i.test(text));
  check('the signal card renders', /BURNOUT SIGNAL/i.test(text));
  check('a band is shown', /Not yet|Green|Amber|Red/.test(text));
  check('and one suggested action', /SUGGESTED FOR YOU/i.test(text));
  await page.screenshot({ path: `${SHOTS}/01-today.png`, fullPage: true });

  // -- The check-in --------------------------------------------------------
  console.log('\ncheck-in');
  await page.getByText(/Today's check-in|Check in/i).first().click();
  await page.waitForTimeout(1800);

  text = await page.textContent('body');
  check('the pulse opens on energy', /How's your energy today\?/.test(text));
  await page.screenshot({ path: `${SHOTS}/02-pulse.png`, fullPage: true });

  const scale = (value, which) =>
    page.getByRole('button', { name: String(value), exact: true }).nth(which);

  await scale(2, 0).click();
  await page.waitForTimeout(900);
  check('answering advances the step', /2 of 3/.test(await page.textContent('body')));

  // Step two carries two scales: detachment, then effectiveness.
  await scale(4, 0).click();
  await page.waitForTimeout(500);
  await scale(2, 1).click();
  await page.waitForTimeout(1200);
  check('both dimensions answered reaches step three', /3 of 3/.test(await page.textContent('body')));
  await page.screenshot({ path: `${SHOTS}/03-pulse-step3.png`, fullPage: true });

  await page.getByRole('button', { name: 'No', exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Yes', exact: true }).last().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Done', exact: true }).first().click();
  await page.waitForTimeout(2500);

  text = await page.textContent('body');
  check('saving returns to the signal it just changed', /BURNOUT SIGNAL/i.test(text));
  await page.screenshot({ path: `${SHOTS}/04-after-check-in.png`, fullPage: true });

  // -- The Unfreezer -------------------------------------------------------
  console.log('\nunfreezer');
  await page.getByText('UNFREEZE', { exact: false }).first().click();
  await page.waitForTimeout(1500);
  await page
    .locator('textarea, input[type="text"]')
    .first()
    .fill('Build the IRR summary for Fund III for the Friday client call');
  await page.getByText('Get my first step').first().click();
  await page.waitForTimeout(2500);

  text = await page.textContent('body');
  check('a plan comes back from the server', /YOUR FIRST 3 STEPS/i.test(text), text.slice(0, 160));
  check('the first step names the task', /IRR summary/.test(text));
  check('manager questions render', /ASK YOUR MANAGER/i.test(text));
  await page.screenshot({ path: `${SHOTS}/05-unfreeze.png`, fullPage: true });

  // -- The crisis guardrail, on the phone -----------------------------------
  console.log('\ncrisis routing');
  await page
    .locator('textarea, input[type="text"]')
    .first()
    .fill('I have been thinking about suicide');
  await page.getByText('Get my first step').first().click();
  await page.waitForTimeout(2500);

  text = await page.textContent('body');
  check('the crisis surface replaces the screen', /Talk to someone now/i.test(text), text.slice(0, 160));
  check('the helpline is shown', /14416/.test(text));
  check('and no task plan sits alongside it', !/YOUR FIRST 3 STEPS/i.test(text));
  await page.screenshot({ path: `${SHOTS}/06-crisis.png`, fullPage: true });

  // -- Reset, care, week ----------------------------------------------------
  console.log('\nthe rest of the app');
  await page.getByText('RESET', { exact: false }).first().click();
  await page.waitForTimeout(1200);
  check('the reset shows the breathing pattern', /IN FOR 4, OUT FOR 6/i.test(await page.textContent('body')));
  await page.screenshot({ path: `${SHOTS}/07-reset.png`, fullPage: true });

  await page.getByText('SUPPORT', { exact: false }).first().click();
  await page.waitForTimeout(1200);
  text = await page.textContent('body');
  check('the crisis line is first on support', /NEED HELP RIGHT NOW/i.test(text));
  check('placeholder partners are labelled', /placeholder/i.test(text));
  await page.screenshot({ path: `${SHOTS}/08-care.png`, fullPage: true });

  await page.getByText('WEEK', { exact: false }).first().click();
  await page.waitForTimeout(2200);
  check('the weekly insight renders', /Your week, in brief/i.test(await page.textContent('body')));
  await page.screenshot({ path: `${SHOTS}/09-week.png`, fullPage: true });

  // -- Errors ---------------------------------------------------------------
  console.log('\nconsole');
  // react-native-web emits deprecation notices for props that are correct on
  // native (pointerEvents, shadow*). They are artefacts of the web export, not
  // of the app, so they are not failures here.
  const ignorable = /ERR_CERT|DevTools|pointerEvents|shadow\*|"shadow/i;
  const real = pageErrors.filter((error) => !ignorable.test(error));
  check('no page errors across the whole walk', real.length === 0, real.slice(0, 2).join(' | '));

  await browser.close();

  console.log(`\nScreenshots in ${SHOTS}/`);
  if (failed > 0) {
    console.error(`${failed} check(s) failed`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('drive run failed:', error);
  process.exit(1);
});
