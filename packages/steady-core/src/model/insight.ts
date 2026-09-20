/**
 * The weekly insight.
 *
 * "Your week, in brief": an energy delta, a check-in count, one pattern, the
 * wins the person logged, and one small experiment for next week.
 *
 * ## The rule this file is built around
 *
 * **Never manufacture a pattern.** The prototype's example ("your hardest days
 * were Monday and Thursday, both after late finishes") is a real observation
 * when the data supports it and a horoscope when it does not. So `pattern` is
 * `null` unless the difference clears a threshold, and the UI is built to
 * render the insight without one.
 *
 * The experiment is always present, because ending a weekly review with
 * nothing to try is a wasted screen — but it is drawn from what the data
 * actually shows, and it is small enough to do.
 */

import type { CheckIn, WeeklyInsight } from '../types.js';
import { LOW_ENERGY_AT_OR_BELOW, WINDOW_DAYS } from './constants.js';
import { addDays, daysEndingAt, weekdayName } from './dates.js';

/**
 * How much worse a weekday has to be than the rest of the week before it is
 * worth naming. On a 1–5 energy scale, half a point is the smallest gap a
 * person would recognise in their own week.
 */
const PATTERN_MIN_GAP = 0.5;

/** A weekday needs at least this many observations before it can be named. */
const PATTERN_MIN_OBSERVATIONS = 2;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * The pattern sentence, or null.
 *
 * Looks across the trailing four weeks rather than the reported week alone: a
 * weekday pattern is a claim about a habit, and one Monday is not a habit.
 */
function findPattern(history: CheckIn[], to: string): string | null {
  const lookback = new Set(daysEndingAt(to, WINDOW_DAYS * 4));
  const recent = history.filter((c) => lookback.has(c.date));
  if (recent.length < WINDOW_DAYS) return null;

  const byWeekday = new Map<string, CheckIn[]>();
  for (const checkIn of recent) {
    const day = weekdayName(checkIn.date);
    byWeekday.set(day, [...(byWeekday.get(day) ?? []), checkIn]);
  }

  const overall = mean(recent.map((c) => c.energy));
  if (overall === null) return null;

  const worst = [...byWeekday.entries()]
    .filter(([, rows]) => rows.length >= PATTERN_MIN_OBSERVATIONS)
    .map(([day, rows]) => ({
      day,
      energy: mean(rows.map((r) => r.energy)) as number,
      lateShare: rows.filter((r) => r.workedLate).length / rows.length,
    }))
    .filter((d) => overall - d.energy >= PATTERN_MIN_GAP)
    .sort((a, b) => a.energy - b.energy)
    .slice(0, 2);

  if (worst.length === 0) return null;

  const days = worst.map((d) => d.day);
  const names = days.length === 2 ? `${days[0]} and ${days[1]}` : (days[0] as string);
  const allAfterLateFinishes = worst.every((d) => d.lateShare >= 0.5);

  // Only claim the late-finish link when every named day actually shows it.
  return allAfterLateFinishes
    ? `Your hardest days were ${names}, both after late finishes.`
    : `Your hardest days were ${names}.`;
}

/**
 * One small experiment for next week.
 *
 * Ordered by what the week's data most supports, and phrased as something to
 * try rather than something to comply with. The deck's "won't do" list rules
 * out guilt-driven mechanics, and an experiment a person fails at is exactly
 * the guilt this product is supposed to reduce — so every one of these is
 * scoped to two days, not seven.
 */
function chooseExperiment(week: CheckIn[], pattern: string | null): string {
  if (week.length === 0) {
    return 'Try one check-in a day for three days next week, and see what shows up.';
  }

  const lateDays = week.filter((c) => c.workedLate).length;
  const shortSleep = week.filter((c) => c.sleepHours < 6).length;
  const painDays = week.filter((c) => c.bodyPain).length;
  const lowEnergy = week.filter((c) => c.energy <= LOW_ENERGY_AT_OR_BELOW).length;
  const distant = week.filter((c) => c.detachment >= 4).length;

  if (lateDays >= 3 || pattern?.includes('late finishes')) {
    return 'Try a hard stop at 7:30 pm on two days next week.';
  }
  if (shortSleep >= 3) {
    return 'Try putting your phone in another room on two nights next week.';
  }
  if (painDays >= 3) {
    return 'Try a ten-minute walk after lunch on two days — and mention the headaches to a doctor.';
  }
  if (distant >= 3) {
    return 'Try picking one task next week that you would have chosen for yourself, and do it first.';
  }
  if (lowEnergy >= 3) {
    return 'Try blocking your first hour on two days next week, before anything else lands.';
  }
  if (week.length < 4) {
    return 'Try checking in on two more days next week — the weekly read gets sharper with more of them.';
  }
  return 'Try one 90-second reset before your hardest meeting next week.';
}

/**
 * Build the weekly insight.
 *
 * @param history  The person's whole check-in history, any order.
 * @param wins     Wins logged, newest first.
 * @param to       Last day of the week being reported, `YYYY-MM-DD`.
 */
export function buildWeeklyInsight(
  history: CheckIn[],
  wins: Array<{ date: string; text: string }>,
  to: string,
): WeeklyInsight {
  const thisWeek = new Set(daysEndingAt(to, WINDOW_DAYS));
  const lastWeek = new Set(daysEndingAt(addDays(to, -WINDOW_DAYS), WINDOW_DAYS));

  const current = history.filter((c) => thisWeek.has(c.date));
  const previous = history.filter((c) => lastWeek.has(c.date));

  const currentEnergy = mean(current.map((c) => c.energy));
  const previousEnergy = mean(previous.map((c) => c.energy));

  // A delta needs both weeks. Comparing this week against nothing produces a
  // number that looks like a measurement and is not one.
  const energyDeltaPercent =
    currentEnergy !== null && previousEnergy !== null && previousEnergy > 0
      ? Math.round(((currentEnergy - previousEnergy) / previousEnergy) * 100)
      : null;

  const pattern = findPattern(history, to);

  return {
    from: daysEndingAt(to, WINDOW_DAYS)[0] as string,
    to,
    energyDeltaPercent,
    checkInCount: current.length,
    windowDays: WINDOW_DAYS,
    pattern,
    wins: wins.filter((w) => thisWeek.has(w.date)).map((w) => w.text),
    experiment: chooseExperiment(current, pattern),
  };
}
