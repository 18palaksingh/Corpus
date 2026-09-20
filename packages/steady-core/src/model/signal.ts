/**
 * The burnout signal.
 *
 * Turns a run of daily check-ins into one band — green, amber or red — plus
 * the single sentence of evidence and the single next action the home screen
 * is allowed to show.
 *
 * Three rules this file exists to enforce:
 *
 *   1. **It is a signal, not a diagnosis.** Nothing here returns a clinical
 *      label, and `strain` (the internal 0–100) is stripped before it reaches
 *      a client. See `constants.ts` for what is and is not defensible.
 *   2. **Silence beats a guess.** Under `MIN_CHECK_INS_FOR_BAND` check-ins the
 *      band is `unknown` and the app says so, rather than calling three bad
 *      days burnout.
 *   3. **One next action, never a wall of content.** A person reading this
 *      screen has no spare attention.
 */

import type { CheckIn, Signal, SignalBand, Suggestion } from '../types.js';
import {
  BAND_THRESHOLD,
  CARE_BRIDGE_RED_STREAK_DAYS,
  DIMENSION_WEIGHT,
  LOW_ENERGY_AT_OR_BELOW,
  MIN_CHECK_INS_FOR_BAND,
  MODIFIER,
  WINDOW_DAYS,
} from './constants.js';
import { daysEndingAt } from './dates.js';

/** Map a 1–5 answer onto 0–100, where 5 is maximum strain. */
function ascending(value: number): number {
  return ((value - 1) / 4) * 100;
}

/** Map a 1–5 answer onto 0–100, where 1 is maximum strain. */
function descending(value: number): number {
  return ((5 - value) / 4) * 100;
}

/** The three WHO dimensions for one check-in, each 0–100 strain. */
function dimensionsOf(checkIn: CheckIn): {
  exhaustion: number;
  distance: number;
  efficacy: number;
} {
  return {
    // Low energy means high exhaustion, so energy inverts.
    exhaustion: descending(checkIn.energy),
    // Detachment is already "more is worse".
    distance: ascending(checkIn.detachment),
    // Low effectiveness means reduced professional efficacy, so it inverts.
    efficacy: descending(checkIn.effectiveness),
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Weighted strain for a set of check-ins, before physical-signal modifiers.
 * Exported for the tests and the insight model; not part of the public API.
 */
function baseStrain(checkIns: CheckIn[]): number {
  const dims = checkIns.map(dimensionsOf);
  return (
    mean(dims.map((d) => d.exhaustion)) * DIMENSION_WEIGHT.exhaustion +
    mean(dims.map((d) => d.distance)) * DIMENSION_WEIGHT.distance +
    mean(dims.map((d) => d.efficacy)) * DIMENSION_WEIGHT.efficacy
  );
}

/**
 * Sleep debt and body pain, in strain points.
 *
 * Capped at `MODIFIER.totalMax` — these are context, not the diagnosis. A
 * person who sleeps badly but is engaged and effective should not be pushed a
 * whole band by sleep alone.
 */
function modifierStrain(checkIns: CheckIn[]): number {
  if (checkIns.length === 0) return 0;

  const meanSleep = mean(checkIns.map((c) => c.sleepHours));
  const debtHours = Math.max(0, MODIFIER.sleepDebtBelowHours - meanSleep);
  const sleep = Math.min(MODIFIER.sleepDebtMax, debtHours * MODIFIER.sleepDebtPerHour);

  const painShare = checkIns.filter((c) => c.bodyPain).length / checkIns.length;
  const pain = painShare * MODIFIER.bodyPainAtEveryDay;

  return Math.min(MODIFIER.totalMax, sleep + pain);
}

function bandFor(strain: number): Exclude<SignalBand, 'unknown'> {
  if (strain >= BAND_THRESHOLD.red) return 'red';
  if (strain >= BAND_THRESHOLD.amber) return 'amber';
  return 'green';
}

/** Strain for a window, rounded to one decimal so tests can pin it. */
function strainFor(checkIns: CheckIn[]): number {
  const raw = baseStrain(checkIns) + modifierStrain(checkIns);
  return Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
}

/**
 * How many consecutive days, counting back from `today`, the running signal
 * would have been red.
 *
 * Computed by replaying the window as it stood on each of those days, because
 * "red for 10 days" has to mean the band the person actually saw on each of
 * those days — not today's window projected backwards.
 */
function redStreak(checkIns: CheckIn[], today: string): number {
  const byDay = new Map(checkIns.map((c) => [c.date, c]));
  let streak = 0;

  // Walk back a bounded distance. Beyond a couple of months the number stops
  // meaning anything to a person, and the care offer has long since fired.
  for (let back = 0; back < 90; back += 1) {
    const asOf = daysEndingAt(today, back + 1)[0] as string;
    const window = daysEndingAt(asOf, WINDOW_DAYS)
      .map((d) => byDay.get(d))
      .filter((c): c is CheckIn => c !== undefined);

    if (window.length < MIN_CHECK_INS_FOR_BAND) break;
    if (bandFor(strainFor(window)) !== 'red') break;
    streak += 1;
  }

  return streak;
}

/**
 * The one sentence under the band.
 *
 * Always a fact from the window, never an interpretation. "Energy low for 6 of
 * 7 days" is something the person can check against their own memory; "you
 * seem to be struggling" is something they can only accept or resent.
 */
function evidenceFor(checkIns: CheckIn[], band: SignalBand): string {
  if (band === 'unknown' || checkIns.length === 0) return '';

  const total = checkIns.length;
  const lowEnergy = checkIns.filter((c) => c.energy <= LOW_ENERGY_AT_OR_BELOW).length;
  const distant = checkIns.filter((c) => c.detachment >= 4).length;
  const ineffective = checkIns.filter((c) => c.effectiveness <= 2).length;
  const painDays = checkIns.filter((c) => c.bodyPain).length;
  const shortSleep = checkIns.filter((c) => c.sleepHours < MODIFIER.sleepDebtBelowHours).length;

  // Pick the strongest true statement, in the order the dimensions are weighted.
  const candidates: Array<[number, string]> = [
    [lowEnergy, `Energy low for ${lowEnergy} of ${total} days`],
    [distant, `Felt distant from your work on ${distant} of ${total} days`],
    [ineffective, `Struggled to feel effective on ${ineffective} of ${total} days`],
    [painDays, `Headaches or body pain on ${painDays} of ${total} days`],
    [shortSleep, `Under six hours of sleep on ${shortSleep} of ${total} days`],
  ];

  const best = candidates.filter(([count]) => count >= 2).sort((a, b) => b[0] - a[0])[0];
  if (best) return best[1];

  if (band === 'green') return `Steady across ${total} check-ins this week`;

  // Amber or red with no single day standing out — the week was flat rather
  // than spiky, which is a real and common way to arrive here. A count is the
  // wrong shape for that, so describe the dimension carrying the most weight.
  //
  // This branch exists because the alternative was "Based on 6 check-ins this
  // week", which is a sentence that says nothing sitting directly under a
  // badge that says something. If the band is amber or red, the person is owed
  // a reason.
  // `checkIns` here is already the windowed list the band was computed from.
  return flatWeekEvidence(checkIns, total);
}

/**
 * The sentence for a week that is uniformly middling.
 *
 * Names the dimension with the highest mean strain, phrased so it stays true
 * whether the mean is "flat" or genuinely low. Still a fact about what was
 * answered, never an interpretation of the person.
 */
function flatWeekEvidence(checkIns: CheckIn[], total: number): string {
  const dims = checkIns.map(dimensionsOf);
  const means = {
    exhaustion: mean(dims.map((d) => d.exhaustion)),
    distance: mean(dims.map((d) => d.distance)),
    efficacy: mean(dims.map((d) => d.efficacy)),
  };

  const dominant = (Object.entries(means) as Array<[keyof typeof means, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0] as [keyof typeof means, number];

  const [name, value] = dominant;
  const high = value >= 60;

  if (name === 'exhaustion') {
    return high
      ? `Energy has been low every day for ${total} days`
      : `Energy has been flat across ${total} days — no clearly good one`;
  }

  if (name === 'distance') {
    return high
      ? `You have felt distant from your work every day for ${total} days`
      : `Some distance from your work on most of ${total} days`;
  }

  return high
    ? `Feeling on top of your work has been a struggle for ${total} days`
    : `Feeling on top of your work has been hard going across ${total} days`;
}

/**
 * The single next action.
 *
 * Ordered by what the person most needs right now, not by what we most want
 * them to tap. A red streak long enough to matter outranks everything; a
 * missing check-in outranks a nudge to read an insight.
 */
function suggestionFor(
  band: SignalBand,
  checkInDueToday: boolean,
  redStreakDays: number,
): Suggestion {
  if (redStreakDays >= CARE_BRIDGE_RED_STREAK_DAYS) {
    return {
      kind: 'care',
      label: 'Talk to someone',
      reason: `Your signal has been red for ${redStreakDays} days. That's worth talking to someone about.`,
    };
  }

  if (checkInDueToday) {
    return {
      kind: 'check-in',
      label: "Today's check-in",
      reason: 'Three questions, about sixty seconds.',
    };
  }

  if (band === 'red') {
    return {
      kind: 'reset',
      label: '90-sec blank-mind reset',
      reason: 'A hard week. Start by putting the work down for ninety seconds.',
    };
  }

  if (band === 'amber') {
    return {
      kind: 'unfreeze',
      label: 'Unfreeze a task',
      reason: 'Pick the thing you have been circling and get a first step.',
    };
  }

  if (band === 'unknown') {
    return {
      kind: 'check-in',
      label: 'Check in',
      reason: 'A few more days and Steady can tell you what it is seeing.',
    };
  }

  return {
    kind: 'insight',
    label: 'Your week, in brief',
    reason: 'Patterns, wins and one small experiment for next week.',
  };
}

/**
 * Compute the signal.
 *
 * `checkIns` may be the person's entire history in any order — only the
 * `WINDOW_DAYS` ending at `today` are scored, and the red streak replays
 * earlier windows out of the same list.
 */
export function buildSignal(checkIns: CheckIn[], today: string): Signal {
  const window = daysEndingAt(today, WINDOW_DAYS);
  const inWindow = checkIns
    .filter((c) => window.includes(c.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const confident = inWindow.length >= MIN_CHECK_INS_FOR_BAND;
  const strain = confident ? strainFor(inWindow) : 0;
  const band: SignalBand = confident ? bandFor(strain) : 'unknown';
  const redStreakDays = band === 'red' ? redStreak(checkIns, today) : 0;
  const checkInDueToday = !checkIns.some((c) => c.date === today);

  return {
    band,
    strain,
    checkInCount: inWindow.length,
    windowDays: WINDOW_DAYS,
    redStreakDays,
    evidence: evidenceFor(inWindow, band),
    suggestion: suggestionFor(band, checkInDueToday, redStreakDays),
    confident,
  };
}

/** Whether the bridge-to-humans offer should be on the home screen. */
export function careOffered(signal: Signal): boolean {
  return signal.redStreakDays >= CARE_BRIDGE_RED_STREAK_DAYS;
}

/**
 * The last `WINDOW_DAYS` of energy answers, oldest first, with `null` for days
 * that have no check-in. The sparkline on the home screen draws gaps as gaps
 * rather than interpolating over them — a missed day is information.
 */
export function energySeries(checkIns: CheckIn[], today: string): Array<number | null> {
  const byDay = new Map(checkIns.map((c) => [c.date, c]));
  return daysEndingAt(today, WINDOW_DAYS).map((d) => byDay.get(d)?.energy ?? null);
}
