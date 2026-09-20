/**
 * Model tests.
 *
 * Three things are being protected here, in descending order of how much
 * damage a regression would do:
 *
 *   1. Crisis routing. The deck sets this guardrail at 100%.
 *   2. The band never claiming more than the data supports.
 *   3. The copy never leaking the internals of the score, or reading as a
 *      diagnosis.
 *
 * Everything else is ordinary arithmetic coverage.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildResetScript,
  buildSignal,
  buildWeeklyInsight,
  careOffered,
  energySeries,
  planTask,
  screenForCrisis,
  CRISIS_COPY,
  NOT_A_DIAGNOSIS,
  TELE_MANAS,
  addDays,
  daysEndingAt,
  weekdayName,
} from '../index.js';
import type { CheckIn, CheckInInput, Scale } from '../types.js';
import { signalColor } from '../tokens.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TODAY = '2026-09-20';

function checkIn(date: string, overrides: Partial<CheckInInput> = {}): CheckIn {
  return {
    date,
    recordedAt: `${date}T18:00:00.000Z`,
    energy: 3,
    detachment: 3,
    effectiveness: 3,
    sleepHours: 7,
    bodyPain: false,
    workedLate: false,
    ...overrides,
  };
}

/** `count` consecutive days ending at `end`, all with the same answers. */
function run(end: string, count: number, overrides: Partial<CheckInInput> = {}): CheckIn[] {
  return daysEndingAt(end, count).map((d) => checkIn(d, overrides));
}

const THRIVING = { energy: 5, detachment: 1, effectiveness: 5, sleepHours: 8 } as const;
const BURNING_OUT = { energy: 1, detachment: 5, effectiveness: 1, sleepHours: 5 } as const;

// ---------------------------------------------------------------------------
// Crisis routing — the 100% guardrail
// ---------------------------------------------------------------------------

test('crisis screen catches direct disclosures', () => {
  const disclosures = [
    'I want to kill myself',
    'I have been thinking about suicide',
    "I can't go on like this",
    'sometimes I wish I was dead',
    'I keep hurting myself when it gets bad',
    'everyone would be better off without me',
    'there is no reason to live',
    'I took an overdose last year',
  ];

  for (const text of disclosures) {
    assert.equal(screenForCrisis(text).crisis, true, `missed: ${text}`);
  }
});

test('crisis screen is case- and punctuation-insensitive', () => {
  for (const text of ['KILL MYSELF.', 'kill  myself', 'I want to... kill myself!!']) {
    assert.equal(screenForCrisis(text).crisis, true, `missed: ${text}`);
  }
});

test('crisis screen routes even when the sentence is negated', () => {
  // Documented and deliberate: a regex that reasons about negation is one that
  // can be argued into silence. Over-routing is the accepted cost.
  assert.equal(screenForCrisis("I'm not going to kill myself, to be clear").crisis, true);
});

test('crisis screen does not fire on ordinary work frustration', () => {
  const ordinary = [
    'Build the IRR summary for Fund III for the Friday client call',
    'this deadline is career suicide',
    'I am dead tired after that sprint',
    'my laptop died in the middle of the demo',
    'kill the process and restart the server',
    'I want to quit my job',
    'this project is killing me',
  ];

  for (const text of ordinary) {
    assert.equal(screenForCrisis(text).crisis, false, `false positive: ${text}`);
  }
});

test('crisis copy names the real helpline and disclaims the product', () => {
  assert.equal(TELE_MANAS.phone, '14416');
  assert.match(CRISIS_COPY.action, /14416/);
  assert.match(CRISIS_COPY.disclaimer, /not a crisis service/i);
});

// ---------------------------------------------------------------------------
// The signal
// ---------------------------------------------------------------------------

test('too few check-ins produce no band at all', () => {
  const signal = buildSignal(run(TODAY, 2, BURNING_OUT), TODAY);

  assert.equal(signal.band, 'unknown');
  assert.equal(signal.confident, false);
  assert.equal(signal.evidence, '');
  assert.equal(signal.redStreakDays, 0);
});

test('three check-ins is the threshold where a band appears', () => {
  const signal = buildSignal(run(TODAY, 3, BURNING_OUT), TODAY);

  assert.equal(signal.confident, true);
  assert.equal(signal.band, 'red');
});

test('a good week is green, a bad week is red', () => {
  assert.equal(buildSignal(run(TODAY, 7, THRIVING), TODAY).band, 'green');
  assert.equal(buildSignal(run(TODAY, 7, BURNING_OUT), TODAY).band, 'red');
});

test('a flat week — a 3 on everything — is amber', () => {
  const signal = buildSignal(
    run(TODAY, 7, { energy: 3, detachment: 3, effectiveness: 3, sleepHours: 7 }),
    TODAY,
  );

  assert.equal(signal.band, 'amber');
});

test('exhaustion alone is amber; exhaustion with detachment is red', () => {
  // The line the band thresholds exist to draw. Being drained but still
  // engaged is an early warning. Drained *and* pulled away from the work is
  // the WHO's actual picture of burnout, and only that earns red.
  const drainedButEngaged = buildSignal(
    run(TODAY, 7, { energy: 2, detachment: 3, effectiveness: 3, sleepHours: 7 }),
    TODAY,
  );
  const drainedAndDistant = buildSignal(
    run(TODAY, 7, { energy: 2, detachment: 4, effectiveness: 3, sleepHours: 7 }),
    TODAY,
  );

  assert.equal(drainedButEngaged.band, 'amber');
  assert.equal(drainedAndDistant.band, 'red');
});

test('sleep and body pain alone cannot move someone a whole band', () => {
  // Engaged and effective at work, sleeping badly and in pain: the modifiers
  // are capped precisely so this stays green.
  const signal = buildSignal(
    run(TODAY, 7, { ...THRIVING, sleepHours: 3, bodyPain: true }),
    TODAY,
  );

  assert.equal(signal.band, 'green');
});

test('only the last seven days count towards the band', () => {
  const stale = run(addDays(TODAY, -30), 7, BURNING_OUT);
  const current = run(TODAY, 7, THRIVING);

  const signal = buildSignal([...stale, ...current], TODAY);

  assert.equal(signal.band, 'green');
  assert.equal(signal.checkInCount, 7);
});

test('evidence quotes a fact from the window, and counts it correctly', () => {
  const days = daysEndingAt(TODAY, 7);
  const checkIns = days.map((d, i) => checkIn(d, i < 6 ? { energy: 2 } : { energy: 5 }));

  const signal = buildSignal(checkIns, TODAY);

  assert.equal(signal.evidence, 'Energy low for 6 of 7 days');
});

test('an amber or red band always says what it is seeing', () => {
  // A flat week — everything a 3 — is genuinely amber, but no single day
  // crosses a counting threshold. The evidence must still name something: a
  // sentence that only counts check-ins says nothing while sitting directly
  // under a badge that says something.
  const flat = buildSignal(
    run(TODAY, 6, { energy: 3, detachment: 3, effectiveness: 3, sleepHours: 6.5 }),
    TODAY,
  );

  assert.equal(flat.band, 'amber');
  assert.doesNotMatch(flat.evidence, /^Based on \d+ check-ins/);
  assert.match(flat.evidence, /energy|distan|work/i);
});

test('every non-green band produces evidence naming a dimension', () => {
  // Sweep the whole answer space; any combination that lands amber or red has
  // to come with a reason, not a restatement of the check-in count.
  for (let energy = 1; energy <= 5; energy += 1) {
    for (let detachment = 1; detachment <= 5; detachment += 1) {
      for (let effectiveness = 1; effectiveness <= 5; effectiveness += 1) {
        const signal = buildSignal(
          run(TODAY, 5, {
            energy: energy as Scale,
            detachment: detachment as Scale,
            effectiveness: effectiveness as Scale,
            sleepHours: 7,
          }),
          TODAY,
        );

        if (signal.band === 'amber' || signal.band === 'red') {
          assert.doesNotMatch(
            signal.evidence,
            /^Based on \d+ check-ins/,
            `contentless evidence at ${energy}/${detachment}/${effectiveness}`,
          );
          assert.ok(signal.evidence.length > 0);
        }
      }
    }
  }
});

test('evidence never leaks the strain number or the weights', () => {
  for (const overrides of [THRIVING, BURNING_OUT, { energy: 2, detachment: 4 } as const]) {
    const signal = buildSignal(run(TODAY, 7, overrides), TODAY);

    assert.doesNotMatch(signal.evidence, /\b\d{2,}\s*(%|\/\s*100|points?)/i);
    assert.doesNotMatch(signal.evidence, /score|exhaustion|efficacy|weight|strain/i);
  }
});

test('the copy never diagnoses', () => {
  const signal = buildSignal(run(TODAY, 7, BURNING_OUT), TODAY);
  const copy = `${signal.evidence} ${signal.suggestion.label} ${signal.suggestion.reason}`;

  assert.doesNotMatch(copy, /you have|diagnos|disorder|depress|clinical/i);
  assert.match(NOT_A_DIAGNOSIS, /not a diagnosis/i);
});

test('energy series keeps gaps as gaps', () => {
  const series = energySeries([checkIn(TODAY, { energy: 4 })], TODAY);

  assert.equal(series.length, 7);
  assert.deepEqual(series.slice(0, 6), [null, null, null, null, null, null]);
  assert.equal(series[6], 4);
});

// ---------------------------------------------------------------------------
// The bridge to humans
// ---------------------------------------------------------------------------

test('a sustained red streak opens the bridge to humans', () => {
  const signal = buildSignal(run(TODAY, 20, BURNING_OUT), TODAY);

  assert.equal(signal.band, 'red');
  assert.ok(signal.redStreakDays >= 10, `streak was ${signal.redStreakDays}`);
  assert.equal(careOffered(signal), true);
  assert.equal(signal.suggestion.kind, 'care');
  assert.match(signal.suggestion.reason, /worth talking to someone about/);
});

test('one bad week does not open the bridge', () => {
  const signal = buildSignal(run(TODAY, 7, BURNING_OUT), TODAY);

  assert.equal(signal.band, 'red');
  assert.equal(careOffered(signal), false);
});

test('the red streak counts the band the person actually saw each day', () => {
  // Five good days, then ten bad ones. The streak is bounded by how long the
  // trailing window has actually been red, not by the length of the bad run.
  const good = run(addDays(TODAY, -10), 5, THRIVING);
  const bad = run(TODAY, 10, BURNING_OUT);

  const signal = buildSignal([...good, ...bad], TODAY);

  assert.equal(signal.band, 'red');
  assert.ok(signal.redStreakDays > 0 && signal.redStreakDays <= 10);
});

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

test('a missing check-in outranks everything except the care bridge', () => {
  const yesterday = addDays(TODAY, -1);
  const signal = buildSignal(run(yesterday, 7, BURNING_OUT), TODAY);

  assert.equal(signal.suggestion.kind, 'check-in');
});

test('the care bridge outranks a missing check-in', () => {
  const yesterday = addDays(TODAY, -1);
  const signal = buildSignal(run(yesterday, 25, BURNING_OUT), TODAY);

  assert.equal(signal.suggestion.kind, 'care');
});

test('a red day that is already checked in leads with the reset', () => {
  const signal = buildSignal(run(TODAY, 7, BURNING_OUT), TODAY);

  assert.equal(signal.suggestion.kind, 'reset');
});

// ---------------------------------------------------------------------------
// The Task Unfreezer
// ---------------------------------------------------------------------------

test('the deck\'s own example task produces three steps and two questions', () => {
  const plan = planTask('Build the IRR summary for Fund III for the Friday client call');

  assert.ok(plan);
  assert.equal(plan.shape, 'analysis');
  assert.equal(plan.steps.length, 3);
  assert.equal(plan.managerQuestions.length, 2);
  assert.equal(plan.timerMinutes, 10);
  assert.match(plan.steps[0] as string, /IRR summary/);
});

test('task shapes are detected, with the specific winning over the general', () => {
  const cases: Array<[string, string]> = [
    ['Review the valuation model before Thursday', 'review'],
    ['Fix the failing checkout tests', 'fix'],
    ['Put together a deck for the board', 'deck'],
    ['Draft the quarterly memo for the partners', 'writing'],
    ['Research the competitive landscape for logistics', 'research'],
    ['Run the Monday standup', 'meeting'],
    ['Submit my expenses from the Delhi trip', 'admin'],
    ['Sort out the thing with the vendor', 'general'],
  ];

  for (const [task, shape] of cases) {
    assert.equal(planTask(task)?.shape, shape, `wrong shape for: ${task}`);
  }
});

test('the first step never depends on someone else replying', () => {
  const tasks = [
    'Build the IRR summary for Fund III',
    'Draft the quarterly memo',
    'Fix the failing checkout tests',
    'Sort out the thing with the vendor',
  ];

  for (const task of tasks) {
    const first = planTask(task)?.steps[0] as string;
    assert.doesNotMatch(first, /^ask |wait for|once .* replies/i, `blocking first step: ${first}`);
  }
});

test('too little text gets the empty state, not three generic steps', () => {
  assert.equal(planTask(''), null);
  assert.equal(planTask('   '), null);
  assert.equal(planTask('the doc'), null);
});

test('a long task is handled without producing an unreadable step', () => {
  const plan = planTask(
    'Build the consolidated quarterly performance summary across all three funds including the fee reconciliation and the LP-by-LP breakdown for the Friday call',
  );

  assert.ok(plan);
  for (const step of plan.steps) {
    assert.ok(step.length <= 120, `step too long: ${step}`);
    assert.doesNotMatch(step, /\s{2,}|\bof\s*$|\bthe\s*$/);
  }
});

test('a truncated task handle never ends on a dangling function word', () => {
  // "Build the IRR summary for Fund III for the Friday client call" truncates
  // mid-phrase; the result must not read "…for Fund III for…".
  const cases = [
    'Build the IRR summary for Fund III for the Friday client call',
    'Write the quarterly performance memo for the partners and the LP group',
    'Research the competitive landscape for logistics across the region',
  ];

  for (const task of cases) {
    const first = planTask(task)?.steps[0] as string;
    assert.doesNotMatch(
      first,
      /\b(of|for|the|a|an|and|in|on|to|with|across|from|at|by)…/i,
      `dangling word before the ellipsis: ${first}`,
    );
  }
});

// ---------------------------------------------------------------------------
// The blank-mind reset
// ---------------------------------------------------------------------------

test('the 90-second reset actually runs for 90 seconds', () => {
  const script = buildResetScript();

  assert.equal(script.totalSeconds, 90);
  assert.equal(
    script.steps.reduce((sum, s) => sum + s.seconds, 0),
    90,
  );
});

test('the exhale is longer than the inhale', () => {
  const script = buildResetScript();
  const inhale = script.steps.find((s) => s.kind === 'breathe-in');
  const exhale = script.steps.find((s) => s.kind === 'breathe-out');

  assert.ok(inhale && exhale);
  assert.ok(exhale.seconds > inhale.seconds);
});

test('the reset ends on grounding, not on breathing', () => {
  const script = buildResetScript();

  assert.equal(script.steps[script.steps.length - 1]?.kind, 'ground');
});

// ---------------------------------------------------------------------------
// The weekly insight
// ---------------------------------------------------------------------------

test('the energy delta compares this week against last week', () => {
  const lastWeek = run(addDays(TODAY, -7), 7, { energy: 4 });
  const thisWeek = run(TODAY, 7, { energy: 2 });

  const insight = buildWeeklyInsight([...lastWeek, ...thisWeek], [], TODAY);

  assert.equal(insight.energyDeltaPercent, -50);
  assert.equal(insight.checkInCount, 7);
});

test('there is no delta when there is nothing to compare against', () => {
  const insight = buildWeeklyInsight(run(TODAY, 7, { energy: 3 }), [], TODAY);

  assert.equal(insight.energyDeltaPercent, null);
});

test('a pattern is only named when the data supports one', () => {
  const flat = buildWeeklyInsight(run(TODAY, 28, { energy: 3 }), [], TODAY);

  assert.equal(flat.pattern, null);
});

test('a real weekday pattern is named, with the late-finish link when it holds', () => {
  const history = daysEndingAt(TODAY, 28).map((d) => {
    const hard = weekdayName(d) === 'Monday' || weekdayName(d) === 'Thursday';
    return checkIn(d, hard ? { energy: 1, workedLate: true } : { energy: 4 });
  });

  const insight = buildWeeklyInsight(history, [], TODAY);

  assert.ok(insight.pattern);
  assert.match(insight.pattern, /Monday/);
  assert.match(insight.pattern, /Thursday/);
  assert.match(insight.pattern, /late finishes/);
});

test('the late-finish link is dropped when late finishes are not the story', () => {
  const history = daysEndingAt(TODAY, 28).map((d) => {
    const hard = weekdayName(d) === 'Monday';
    return checkIn(d, hard ? { energy: 1 } : { energy: 4 });
  });

  const insight = buildWeeklyInsight(history, [], TODAY);

  assert.ok(insight.pattern);
  assert.match(insight.pattern, /Monday/);
  assert.doesNotMatch(insight.pattern, /late finishes/);
});

test('wins are scoped to the week being reported', () => {
  const wins = [
    { date: TODAY, text: 'Started the IRR model early' },
    { date: addDays(TODAY, -2), text: 'Asked 2 clarifying questions' },
    { date: addDays(TODAY, -20), text: 'Old win from last month' },
  ];

  const insight = buildWeeklyInsight(run(TODAY, 7), wins, TODAY);

  assert.deepEqual(insight.wins, ['Started the IRR model early', 'Asked 2 clarifying questions']);
});

test('the experiment is scoped to a couple of days, never the whole week', () => {
  const lateWeek = run(TODAY, 7, { workedLate: true, energy: 2 });
  const insight = buildWeeklyInsight(lateWeek, [], TODAY);

  assert.match(insight.experiment, /two days|two nights|three days|one 90-second|one task/i);
  assert.doesNotMatch(insight.experiment, /every day|daily|streak/i);
});

test('the insight never shames a low check-in count', () => {
  const insight = buildWeeklyInsight(run(TODAY, 2), [], TODAY);

  assert.doesNotMatch(insight.experiment, /only|failed|missed|should have/i);
});

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

test('every signal band has a distinct, complete colour set', () => {
  const bands = ['green', 'amber', 'red', 'unknown'] as const;
  const solids = new Set(bands.map((b) => signalColor[b].solid));

  assert.equal(solids.size, bands.length);
  for (const band of bands) {
    for (const role of ['solid', 'bg', 'fg'] as const) {
      assert.match(signalColor[band][role], /^#[0-9A-F]{6}$/i, `${band}.${role}`);
    }
  }
});

test('band foregrounds are dark enough to read on their tinted backgrounds', () => {
  // Rough relative-luminance check. Not a full WCAG implementation — enough to
  // catch a palette edit that makes amber-on-amber unreadable.
  const luminance = (hex: string): number => {
    const channel = (c: number): number => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const r = channel(parseInt(hex.slice(1, 3), 16));
    const g = channel(parseInt(hex.slice(3, 5), 16));
    const b = channel(parseInt(hex.slice(5, 7), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  for (const band of ['green', 'amber', 'red', 'unknown'] as const) {
    const { fg, bg } = signalColor[band];
    const ratio = (Math.max(luminance(fg), luminance(bg)) + 0.05) /
      (Math.min(luminance(fg), luminance(bg)) + 0.05);
    assert.ok(ratio >= 4.5, `${band}: contrast ${ratio.toFixed(2)} is below 4.5`);
  }
});

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

test('day arithmetic crosses months and years', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('a window is the right length and ends where it was asked to', () => {
  const days = daysEndingAt(TODAY, 7);

  assert.equal(days.length, 7);
  assert.equal(days[6], TODAY);
  assert.equal(days[0], addDays(TODAY, -6));
});

test('a malformed day fails loudly rather than silently scoring nothing', () => {
  assert.throws(() => addDays('20-09-2026', 1), /YYYY-MM-DD/);
});

test('scale values stay inside the instrument', () => {
  const scales: Scale[] = [1, 2, 3, 4, 5];
  for (const s of scales) {
    const signal = buildSignal(run(TODAY, 7, { energy: s, detachment: s, effectiveness: s }), TODAY);
    assert.ok(['green', 'amber', 'red'].includes(signal.band));
  }
});
