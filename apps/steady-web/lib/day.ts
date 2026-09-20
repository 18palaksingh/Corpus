import 'server-only';

import { assertDay } from '@steady/core';

import { BadRequestError } from './http';

/**
 * Whose "today" is it?
 *
 * The server cannot answer this. A check-in at 00:30 in Bengaluru belongs to
 * the day that just started there, and a server in `UTC` would file it against
 * the previous day — quietly breaking the streak, the window and the "have I
 * checked in today" prompt for every user east of Greenwich.
 *
 * So the client sends its own local day and the server validates it. Clients
 * can lie, but the only thing a lie buys is a misfiled check-in in your own
 * account, and the `@@unique([userId, date])` constraint stops the obvious
 * abuse of back-filling a week of perfect days.
 */

/** The server's own local day, used only as a fallback. */
export function serverDay(timeZone = 'Asia/Kolkata'): string {
  // `en-CA` formats as YYYY-MM-DD, which is the shape the model wants.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * How far from the server's own day a client's claimed day may be.
 *
 * Two days covers every real timezone offset (UTC−12 to UTC+14 is a 26-hour
 * spread, so two calendar days) plus a little clock skew. Beyond that the
 * client is not in a timezone, it is wrong or malicious.
 */
const MAX_DAY_SKEW = 2;

function daysApart(a: string, b: string): number {
  const ms = Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`);
  return Math.abs(Math.round(ms / 86_400_000));
}

/**
 * Read the client's local day from `?day=`, falling back to the server's.
 *
 * @param fallbackZone The user's stored timezone, used when the client sends
 *                     nothing — a weekly-insight cron has no client to ask.
 */
export function resolveDay(request: Request, fallbackZone = 'Asia/Kolkata'): string {
  const claimed = new URL(request.url).searchParams.get('day');
  if (!claimed) return serverDay(fallbackZone);

  try {
    assertDay(claimed);
  } catch {
    throw new BadRequestError('day must be formatted YYYY-MM-DD');
  }

  if (daysApart(claimed, serverDay('UTC')) > MAX_DAY_SKEW) {
    throw new BadRequestError('day is too far from the current date');
  }

  return claimed;
}

/** Same rules, for a day carried in a JSON body. */
export function resolveBodyDay(
  body: Record<string, unknown>,
  fallbackZone = 'Asia/Kolkata',
): string {
  const claimed = body.day;
  if (claimed === undefined || claimed === null) return serverDay(fallbackZone);

  if (typeof claimed !== 'string') {
    throw new BadRequestError('day must be a string formatted YYYY-MM-DD');
  }

  try {
    assertDay(claimed);
  } catch {
    throw new BadRequestError('day must be formatted YYYY-MM-DD');
  }

  if (daysApart(claimed, serverDay('UTC')) > MAX_DAY_SKEW) {
    throw new BadRequestError('day is too far from the current date');
  }

  return claimed;
}
