/**
 * Date helpers.
 *
 * Everything is computed in UTC against ISO date strings so a snapshot renders
 * identically on a server in one timezone and a phone in another.
 */

export function parse(iso: string): Date {
  return new Date(iso);
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/** Whole months from `from` to `to`, ignoring the day of month. */
export function monthsBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

/** The nth day of the month following `iso`. */
export function dayOfNextMonth(iso: string, day: number): string {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, day)).toISOString();
}

/** The given day in the same month as `iso`. */
export function dayOfMonth(iso: string, day: number): string {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), day)).toISOString();
}

/**
 * Months from the period start to the end of the Indian financial year
 * (31 March), counting the first full month after the period.
 */
export function monthsToFinancialYearEnd(periodStart: string): number {
  const d = new Date(periodStart);
  const year = d.getUTCMonth() >= 3 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
  const fyEnd = new Date(Date.UTC(year, 2, 1));
  return monthsBetween(periodStart, fyEnd.toISOString());
}
