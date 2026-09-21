/**
 * The pairing merge, end to end.
 *
 * Split out from `flows.mjs` because it is the one genuinely multi-step
 * transaction in the product — it moves rows between two accounts, resolves a
 * uniqueness conflict, rotates a credential and deletes an account, all of
 * which has to happen or none of it. A partial failure here does not produce
 * an error message; it produces someone's check-in history silently split
 * across two accounts, one of which they can no longer reach.
 *
 * It is also the place where SQLite and Postgres are most likely to disagree,
 * so this runs against whichever database the server is actually using.
 *
 * Everything is asserted through the API. No database client, no direct row
 * inspection — if the merge cannot be observed through the endpoints the app
 * itself uses, the app cannot show it to a person either.
 *
 *   npm run e2e:pairing -w @steady/web
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

function dayBack(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

const today = () => dayBack(0);

async function newDevice(label) {
  const response = await fetch(`${BASE}/api/device`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!response.ok) throw new Error(`device sign-up failed: ${response.status}`);
  return response.json();
}

function as(token, init = {}) {
  return {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  };
}

function checkIn(token, day, energy) {
  return fetch(
    `${BASE}/api/check-in`,
    as(token, {
      method: 'POST',
      body: JSON.stringify({
        day,
        energy,
        detachment: 3,
        effectiveness: 3,
        sleepHours: 7,
        bodyPain: false,
        workedLate: false,
      }),
    }),
  );
}

async function main() {
  console.log(`Steady pairing · ${BASE}\n`);

  // The phone: three days of history and a win.
  const phone = await newDevice('e2e-phone');
  await checkIn(phone.token, dayBack(2), 4);
  await checkIn(phone.token, dayBack(1), 3);
  await checkIn(phone.token, today(), 2);
  await fetch(
    `${BASE}/api/wins`,
    as(phone.token, { method: 'POST', body: JSON.stringify({ text: 'a win from the phone', day: today() }) }),
  );

  // The account being paired into, which already has an answer for today.
  // That collision is the whole point of the test.
  const account = await newDevice('e2e-account');
  await checkIn(account.token, today(), 5);

  console.log('issuing a code');
  const issued = await fetch(`${BASE}/api/pair`, as(account.token, { method: 'POST' }));
  const codeBody = await issued.json();
  check('a signed-in caller can issue a pairing code', issued.status === 201, `status=${issued.status}`);
  check('the code is six digits', /^\d{6}$/.test(codeBody.code ?? ''), String(codeBody.code));
  check('and it carries an expiry', typeof codeBody.expiresAt === 'string');

  console.log('\nbad codes');
  const wrong = await fetch(
    `${BASE}/api/pair/redeem`,
    as(phone.token, { method: 'POST', body: JSON.stringify({ code: '000000' }) }),
  );
  // 400 for a wrong code, 429 if this run tripped the guess limit — both mean
  // the code was not accepted, which is what is being asserted.
  check('a wrong code is refused', wrong.status === 400 || wrong.status === 429, `status=${wrong.status}`);

  const malformed = await fetch(
    `${BASE}/api/pair/redeem`,
    as(phone.token, { method: 'POST', body: JSON.stringify({ code: 'abc' }) }),
  );
  check('a malformed code is refused', malformed.status === 400 || malformed.status === 429);

  console.log('\nthe merge');
  const redeemed = await fetch(
    `${BASE}/api/pair/redeem`,
    as(phone.token, { method: 'POST', body: JSON.stringify({ code: codeBody.code }) }),
  );
  const merge = await redeemed.json();

  check('redeeming succeeds', redeemed.ok, JSON.stringify(merge).slice(0, 160));
  check('the two non-conflicting days moved', merge.movedDays === 2, `movedDays=${merge.movedDays}`);
  check('the conflicting day was kept, not overwritten', merge.skippedDays === 1, `skippedDays=${merge.skippedDays}`);
  check('the device token is rotated', typeof merge.token === 'string' && merge.token !== phone.token);

  console.log('\nafter the merge');
  const oldToken = await fetch(`${BASE}/api/home?day=${today()}`, as(phone.token));
  check('the phone\'s old token stops working', oldToken.status === 401, `status=${oldToken.status}`);

  const home = await fetch(`${BASE}/api/home?day=${today()}`, as(merge.token));
  check('the rotated token works', home.ok, `status=${home.status}`);

  const account_ = await (await fetch(`${BASE}/api/account`, as(merge.token))).json();
  check('all three days are on one account now', account_.counts?.checkIns === 3, `checkIns=${account_.counts?.checkIns}`);
  check('the phone\'s win came with it', account_.counts?.wins === 1, `wins=${account_.counts?.wins}`);

  const kept = await (await fetch(`${BASE}/api/check-in?day=${today()}`, as(merge.token))).json();
  check(
    "today kept the target account's answer",
    kept.checkIn?.energy === 5,
    `energy=${kept.checkIn?.energy}`,
  );

  console.log('\nreplay');
  const replay = await fetch(
    `${BASE}/api/pair/redeem`,
    as(merge.token, { method: 'POST', body: JSON.stringify({ code: codeBody.code }) }),
  );
  check('a consumed code cannot be used again', replay.status === 400 || replay.status === 429, `status=${replay.status}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('\npairing run failed to complete:', error);
  process.exit(1);
});
