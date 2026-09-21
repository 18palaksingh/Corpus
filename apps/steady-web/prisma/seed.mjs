/**
 * Seeds a demo account.
 *
 * Without this, a fresh install shows an empty app: the signal needs three
 * check-ins before it says anything, and the weekly pattern needs four weeks.
 * Reviewing a product whose entire surface is "not enough data yet" tells you
 * very little, so the seed builds the deck's primary persona — Ananya, four
 * weeks in, signal amber, hardest days Monday and Thursday after late
 * finishes.
 *
 * The data is shaped to exercise the model rather than to flatter it:
 *   - week 4 (most recent) is worse than week 1, so the energy delta is
 *     negative and visible;
 *   - Mondays and Thursdays are genuinely worse *and* genuinely follow late
 *     finishes, so the pattern detector has something true to find;
 *   - one day is missing, so the strip renders a gap.
 *
 * Run it with `npm run db:seed -w @steady/web`. It is idempotent: it deletes
 * the demo account first, so re-running never doubles the history.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@steady.local';

/** `YYYY-MM-DD` for `offset` days before today, in the host's timezone. */
function day(offset) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function weekdayOf(isoDay) {
  return new Date(`${isoDay}T00:00:00Z`).getUTCDay();
}

/**
 * One day's answers.
 *
 * `drift` pulls the whole week down as the four weeks progress, which is what
 * makes the energy delta and the amber band emerge from the data rather than
 * being asserted.
 */
function answersFor(isoDay, drift) {
  const weekday = weekdayOf(isoDay);
  const isHardDay = weekday === 1 || weekday === 4; // Monday, Thursday
  const isWeekend = weekday === 0 || weekday === 6;

  // Calibrated so the earlier weeks sit in green and only the most recent
  // week crosses into amber. Red is deliberately not the demo state: amber is
  // the deck's first-signal moment ("So it's not just me being lazy"), it is
  // where the interesting copy lives, and seeding red would also trip the
  // care bridge on day one, which is a different screen to review.
  if (isWeekend) {
    return {
      energy: Math.max(1, 4 - drift),
      detachment: 2,
      effectiveness: Math.max(1, 4 - drift),
      sleepHours: 8,
      bodyPain: false,
      workedLate: false,
    };
  }

  if (isHardDay) {
    return {
      energy: Math.max(1, 3 - drift),
      detachment: Math.min(5, 3 + drift),
      effectiveness: Math.max(1, 3 - drift),
      sleepHours: 5.5,
      bodyPain: true,
      workedLate: true,
    };
  }

  return {
    energy: Math.max(1, 4 - drift),
    detachment: Math.min(5, 2 + drift),
    effectiveness: Math.max(1, 4 - drift),
    sleepHours: 6.5,
    bodyPain: false,
    workedLate: false,
  };
}

async function main() {
  // Idempotent: cascade removes every child row with the account.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: 'Ananya',
      anonymous: false,
      timezone: 'Asia/Kolkata',
    },
  });

  const checkIns = [];
  let gapUsed = false;

  for (let offset = 27; offset >= 0; offset -= 1) {
    const isoDay = day(offset);

    // One deliberate gap in the current week, so the home strip renders a
    // missing day. It is placed on an ordinary day rather than at a fixed
    // offset: a fixed offset lands on a Monday or Thursday depending on the
    // day you seed, which deletes half the weekday pattern the demo exists to
    // show.
    const weekday = weekdayOf(isoDay);
    const ordinary = weekday !== 1 && weekday !== 4 && weekday !== 0 && weekday !== 6;
    if (offset > 0 && offset < 6 && ordinary && !gapUsed) {
      gapUsed = true;
      continue;
    }

    // 0 for the oldest week, rising to 1 for the most recent.
    const drift = offset <= 6 ? 1 : 0;

    checkIns.push({ userId: user.id, date: isoDay, ...answersFor(isoDay, drift) });
  }

  await prisma.checkIn.createMany({ data: checkIns });

  await prisma.win.createMany({
    data: [
      { userId: user.id, date: day(1), text: 'Started the IRR model early' },
      { userId: user.id, date: day(2), text: 'Asked 2 clarifying questions' },
      { userId: user.id, date: day(9), text: 'Left at 6 on Wednesday' },
    ],
  });

  await prisma.unfreezeSession.create({
    data: {
      userId: user.id,
      task: 'Build the IRR summary for Fund III for the Friday client call',
      shape: 'analysis',
      steps: JSON.stringify([
        "Find last quarter's IRR summary and open it as a template",
        'List the inputs you need, and mark the ones you do not have yet',
        'Build one rough sheet with placeholder numbers — wrong is fine, empty is not',
      ]),
      helped: true,
    },
  });

  console.log(
    `Seeded ${DEMO_EMAIL}: ${checkIns.length} check-ins over 4 weeks, 3 wins, 1 plan.`,
  );
  console.log('Sign in with the "demo account" button (set STEADY_DEMO=1).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
