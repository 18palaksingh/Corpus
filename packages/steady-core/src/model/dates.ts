/**
 * Calendar-day helpers.
 *
 * Steady's unit of time is the local calendar day, not an instant: "did I
 * check in today" has to mean today where the person is, and a check-in at
 * 00:30 belongs to the day it felt like, not to UTC's idea of it. So dates
 * move around as `YYYY-MM-DD` strings and the server is told the client's
 * local day rather than inferring one.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD`, validated. Throws on anything else so bad data fails loudly. */
export function assertDay(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(`Expected a YYYY-MM-DD day, got ${JSON.stringify(day)}`);
  }
  return day;
}

/** The local calendar day of a `Date`, in the host's timezone. */
export function toDay(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a day string to a UTC-midnight `Date`, for arithmetic only. */
export function dayToUtc(day: string): Date {
  assertDay(day);
  return new Date(`${day}T00:00:00.000Z`);
}

/** `day` shifted by `delta` days. Negative goes backwards. */
export function addDays(day: string, delta: number): string {
  const shifted = new Date(dayToUtc(day).getTime() + delta * DAY_MS);
  const y = shifted.getUTCFullYear();
  const m = `${shifted.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${shifted.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayToUtc(to).getTime() - dayToUtc(from).getTime()) / DAY_MS);
}

/** `count` days ending at `end` inclusive, oldest first. */
export function daysEndingAt(end: string, count: number): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) days.push(addDays(end, -i));
  return days;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Weekday name for a day string. */
export function weekdayName(day: string): string {
  return WEEKDAY_NAMES[dayToUtc(day).getUTCDay()] as string;
}
