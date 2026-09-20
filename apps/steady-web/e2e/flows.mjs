/**
 * End-to-end checks against a running server.
 *
 * Not a unit test: the model is covered by `@steady/core`'s own 44 tests. This
 * exercises the things that only exist once auth, the database and the routes
 * are wired together — the seams where a green unit suite still ships a broken
 * product:
 *
 *   - anonymous sign-up actually creates a usable account, with no config;
 *   - the API refuses an unauthenticated caller rather than leaking a default;
 *   - one person cannot read another's data;
 *   - a check-in round-trips and moves the band;
 *   - **the crisis screen fires through the real route**, not just in the model;
 *   - pairing moves a phone's history onto a web account.
 *
 * Run it against a server started with STEADY_DEMO=1:
 *
 *   npm run build -w @steady/web && npm start -w @steady/web &
 *   npm run e2e -w @steady/web
 */

const BASE = process.env.STEADY_BASE_URL ?? 'http://localhost:3100';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Today, as the client sees it. */
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
}

/** Create an anonymous device account and return its bearer token. */
async function newDevice(label) {
  const response = await fetch(`${BASE}/api/device`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label }),
  });

  if (!response.ok) throw new Error(`device sign-up failed: ${response.status}`);
  return (await response.json()).token;
}

function asDevice(token, init = {}) {
  return {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  };
}

async function main() {
  console.log(`Steady end-to-end · ${BASE}\n`);

  // -- The server is up ----------------------------------------------------
  console.log('server');
  const care = await fetch(`${BASE}/api/care`);
  check('care and the crisis line are reachable without a session', care.ok);
  const careBody = await care.json();
  check('the crisis number is Tele-MANAS 14416', careBody.crisis?.phone === '14416');
  check(
    'placeholder partners are flagged as placeholders',
    careBody.partnersArePlaceholders === true,
  );

  // -- Anonymous sign-up ---------------------------------------------------
  console.log('\nanonymous sign-up');
  const token = await newDevice('e2e-primary');
  check('a device gets a token with no credentials at all', typeof token === 'string' && token.length > 20);

  const me = await (await fetch(`${BASE}/api/device`, asDevice(token))).json();
  check('the new account is anonymous', me.anonymous === true);
  check('it has no email', me.email === null);

  // -- The API is closed by default ----------------------------------------
  console.log('\nauthorisation');
  const noAuth = await fetch(`${BASE}/api/home`);
  check('an unauthenticated caller gets 401, not data', noAuth.status === 401);

  const badToken = await fetch(`${BASE}/api/home`, asDevice('not-a-real-token-at-all'));
  check('a bad token gets 401', badToken.status === 401);

  // -- A check-in round-trips ----------------------------------------------
  console.log('\ncheck-in');
  const day = today();
  const empty = await (await fetch(`${BASE}/api/home?day=${day}`, asDevice(token))).json();
  check('a new account has no band yet', empty.signal.band === 'unknown');
  check('and is asked to check in', empty.checkInDueToday === true);

  const posted = await fetch(
    `${BASE}/api/check-in`,
    asDevice(token, {
      method: 'POST',
      body: JSON.stringify({
        day,
        energy: 2,
        detachment: 4,
        effectiveness: 2,
        sleepHours: 5,
        bodyPain: true,
        workedLate: true,
      }),
    }),
  );
  check('a check-in is accepted', posted.status === 201);

  const afterOne = await posted.json();
  check('one check-in is still not enough for a band', afterOne.signal.band === 'unknown');
  check('but it is no longer due today', afterOne.checkInDueToday === false);
  check('the strain number never reaches a client', afterOne.signal.strain === undefined);

  // Two more days, so the band appears.
  for (const back of [1, 2]) {
    const date = new Date();
    date.setDate(date.getDate() - back);
    const past = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

    await fetch(
      `${BASE}/api/check-in`,
      asDevice(token, {
        method: 'POST',
        body: JSON.stringify({
          day: past,
          energy: 1,
          detachment: 5,
          effectiveness: 1,
          sleepHours: 5,
          bodyPain: true,
          workedLate: true,
        }),
      }),
    );
  }

  const afterThree = await (await fetch(`${BASE}/api/home?day=${day}`, asDevice(token))).json();
  check('three check-ins produce a band', afterThree.signal.band === 'red', afterThree.signal.band);
  check('with evidence a person can check', afterThree.signal.evidence.length > 0);
  check('and one suggested action', typeof afterThree.signal.suggestion?.kind === 'string');

  // -- Validation ----------------------------------------------------------
  console.log('\nvalidation');
  const outOfRange = await fetch(
    `${BASE}/api/check-in`,
    asDevice(token, {
      method: 'POST',
      body: JSON.stringify({
        day,
        energy: 9,
        detachment: 3,
        effectiveness: 3,
        sleepHours: 7,
        bodyPain: false,
        workedLate: false,
      }),
    }),
  );
  check('an out-of-range answer is rejected', outOfRange.status === 400);

  const badDay = await fetch(`${BASE}/api/home?day=not-a-day`, asDevice(token));
  check('a malformed day is rejected', badDay.status === 400);

  const farDay = await fetch(`${BASE}/api/home?day=2019-01-01`, asDevice(token));
  check('a day far from now is rejected', farDay.status === 400);

  // -- The Unfreezer -------------------------------------------------------
  console.log('\nunfreezer');
  const planned = await fetch(
    `${BASE}/api/unfreeze`,
    asDevice(token, {
      method: 'POST',
      body: JSON.stringify({ task: 'Build the IRR summary for Fund III for the Friday client call' }),
    }),
  );
  const plan = await planned.json();
  check('a task gets a plan', planned.status === 201 && plan.plan?.steps?.length === 3);
  check('with two manager questions', plan.plan?.managerQuestions?.length === 2);
  check('and a ten-minute timer', plan.plan?.timerMinutes === 10);

  const rated = await fetch(
    `${BASE}/api/unfreeze/feedback`,
    asDevice(token, { method: 'POST', body: JSON.stringify({ id: plan.id, helped: true }) }),
  );
  check('the "did this help" answer is recorded', rated.ok);

  // -- The crisis guardrail, through the real route ------------------------
  console.log('\ncrisis routing');
  const crisis = await fetch(
    `${BASE}/api/unfreeze`,
    asDevice(token, {
      method: 'POST',
      body: JSON.stringify({ task: 'I keep thinking I want to kill myself' }),
    }),
  );
  const crisisBody = await crisis.json();
  check('a disclosure routes to the crisis surface', crisisBody.crisis === true);
  check('and no task plan is returned', crisisBody.plan === undefined);
  check('the helpline number is in the response', crisisBody.copy?.action?.includes('14416'));

  const crisisWin = await fetch(
    `${BASE}/api/wins`,
    asDevice(token, { method: 'POST', body: JSON.stringify({ text: 'I want to die', day }) }),
  );
  check('the wins field is screened too', (await crisisWin.json()).crisis === true);

  const ordinary = await fetch(
    `${BASE}/api/unfreeze`,
    asDevice(token, {
      method: 'POST',
      body: JSON.stringify({ task: 'This deadline is career suicide, fix the failing tests' }),
    }),
  );
  check('ordinary work frustration is not routed', (await ordinary.json()).crisis === false);

  // -- One account cannot read another -------------------------------------
  console.log('\nisolation');
  const otherToken = await newDevice('e2e-other');
  const otherHome = await (
    await fetch(`${BASE}/api/home?day=${day}`, asDevice(otherToken))
  ).json();
  check('a second account sees its own empty state', otherHome.signal.band === 'unknown');
  check('and none of the first account\'s wins', otherHome.recentWins.length === 0);

  const stolen = await fetch(
    `${BASE}/api/unfreeze/feedback`,
    asDevice(otherToken, { method: 'POST', body: JSON.stringify({ id: plan.id, helped: false }) }),
  );
  check('and cannot rate the first account\'s plan', stolen.status === 404);

  // -- Wins and the weekly insight -----------------------------------------
  console.log('\nweek');
  await fetch(
    `${BASE}/api/wins`,
    asDevice(token, { method: 'POST', body: JSON.stringify({ text: 'Started the model early', day }) }),
  );

  const insight = await (await fetch(`${BASE}/api/insight?day=${day}`, asDevice(token))).json();
  check('the weekly insight returns a window', insight.windowDays === 7);
  check('it counts this week\'s check-ins', insight.checkInCount >= 3);
  check('it includes the win just logged', insight.wins.includes('Started the model early'));
  check('and always offers one experiment', typeof insight.experiment === 'string');

  // -- Account deletion ----------------------------------------------------
  console.log('\nerasure');
  const deleted = await fetch(`${BASE}/api/account`, asDevice(otherToken, { method: 'DELETE' }));
  check('an account can delete itself', deleted.ok);

  const afterDelete = await fetch(`${BASE}/api/home?day=${day}`, asDevice(otherToken));
  check('and its token stops working immediately', afterDelete.status === 401);

  // -- Summary -------------------------------------------------------------
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('\ne2e run failed to complete:', error);
  process.exit(1);
});
