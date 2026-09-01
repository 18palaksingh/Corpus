/**
 * Currency and number formatting.
 *
 * Corpus is INR-only. Two rules run through the whole product:
 *   1. Indian digit grouping — ₹2,05,000 not ₹205,000.
 *   2. Lakh/crore abbreviation for large balances — ₹18.4L, ₹1.3Cr.
 *
 * `Intl.NumberFormat('en-IN')` gives us grouping for free on every runtime we
 * target (Node 20+, modern browsers, Hermes with `intl` enabled), but we keep a
 * manual fallback because React Native's default Hermes build has historically
 * shipped without full ICU.
 */

const LAKH = 100_000;
const CRORE = 10_000_000;

let grouper: Intl.NumberFormat | null = null;
function getGrouper(): Intl.NumberFormat | null {
  if (grouper) return grouper;
  try {
    const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
    // Verify the runtime actually applies Indian grouping rather than silently
    // falling back to en-US. 205000 must render as "2,05,000".
    if (fmt.format(205000).replace(/ /g, ' ') !== '2,05,000') return null;
    grouper = fmt;
    return grouper;
  } catch {
    return null;
  }
}

/** Group an integer the Indian way: last three digits, then pairs. */
export function groupIndian(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const sign = value < 0 ? '-' : '';

  const intl = getGrouper();
  if (intl) return sign + intl.format(rounded);

  const digits = String(rounded);
  if (digits.length <= 3) return sign + digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const paired = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}${paired},${last3}`;
}

/** ₹2,05,000 — the default for any exact rupee amount. */
export function inr(value: number): string {
  return `₹${groupIndian(value)}`;
}

/** +₹9,400 / -₹1,200 — for deltas where the direction matters. */
export function inrSigned(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}₹${groupIndian(Math.abs(value))}`;
}

/** ↑ ₹6,100 — the arrow form used on the surplus card. */
export function inrDelta(value: number): string {
  const arrow = value >= 0 ? '↑' : '↓';
  return `${arrow} ₹${groupIndian(Math.abs(value))}`;
}

/**
 * ₹18.4L / ₹1.3Cr / ₹8,200 — abbreviated for balances at lakh scale and above.
 * One decimal place, trailing ".0" dropped (₹6.0L stays as the design shows it
 * when `keepTrailingZero` is set, which the holdings table relies on).
 */
export function inrCompact(value: number, opts: { keepTrailingZero?: boolean } = {}): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= CRORE) return `${sign}₹${trim(abs / CRORE, opts.keepTrailingZero)}Cr`;
  if (abs >= LAKH) return `${sign}₹${trim(abs / LAKH, opts.keepTrailingZero)}L`;
  return inr(value);
}

function trim(n: number, keepTrailingZero = false): string {
  const fixed = n.toFixed(1);
  if (keepTrailingZero) return fixed;
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

/** 68% — whole-number percentages everywhere in the UI. */
export function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** 11.8% — one decimal, used for XIRR and other returns. */
export function pctPrecise(fraction: number, decimals = 1): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

/** +11.8% XIRR — signed return figure. */
export function pctSigned(fraction: number, decimals = 1): string {
  const sign = fraction >= 0 ? '+' : '';
  return `${sign}${(fraction * 100).toFixed(decimals)}%`;
}

/** Clamp a bar fill to the 0–100% the track can actually draw. */
export function clampFill(fraction: number): string {
  return `${Math.max(0, Math.min(1, fraction)) * 100}%`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function monthName(index: number, short: boolean): string {
  const i = Math.max(0, Math.min(11, index));
  return short ? MONTHS_SHORT[i]! : MONTHS[i]!;
}

/** "August 2026" — the period pill in the top bar. */
export function periodLabel(iso: string): string {
  const d = new Date(iso);
  return `${monthName(d.getUTCMonth(), false)} ${d.getUTCFullYear()}`;
}

/** "Jun 2027" — goal completion dates. */
export function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${monthName(d.getUTCMonth(), true)} ${d.getUTCFullYear()}`;
}

/** "2 September" — a date inside a sentence. */
export function dayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${monthName(d.getUTCMonth(), false)}`;
}

/** "28 Aug 2026, 6:40 am" — the sidebar's LAST RUN line. */
export function timestampLabel(iso: string): string {
  const d = new Date(iso);
  const hours24 = d.getUTCHours();
  const suffix = hours24 < 12 ? 'am' : 'pm';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${monthName(d.getUTCMonth(), true)} ${d.getUTCFullYear()}, ${hours12}:${minutes} ${suffix}`;
}

/** "4 accounts, 2 cards and 6 holdings in sync." */
export function list(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]!}`;
}

/** "1 account" / "4 accounts" */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
