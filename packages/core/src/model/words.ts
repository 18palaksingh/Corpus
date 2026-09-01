/** Number words, for copy that reads better spelled out than in digits. */

const CARDINALS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
] as const;

const ORDINALS = [
  'zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth',
  'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
] as const;

export function cardinal(n: number): string {
  return CARDINALS[n] ?? String(n);
}

export function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`;
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
