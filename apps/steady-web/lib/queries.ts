import 'server-only';

import {
  buildSignal,
  buildWeeklyInsight,
  careOffered,
  energySeries,
  type CheckIn,
  type HomeSnapshot,
  type WeeklyInsight,
} from '@steady/core';

import { prisma } from './prisma';

/**
 * The seam between the database and the model.
 *
 * Rows go in, model output comes out. Two rules hold here and are the reason
 * this file exists rather than each route querying for itself:
 *
 *   1. **One model run per response.** The home screen's band and the weekly
 *      insight's numbers are computed from the same fetched history, so they
 *      cannot disagree with each other.
 *   2. **`strain` never leaves.** The internal 0–100 is stripped in
 *      `buildHomeSnapshot` and nowhere else, so there is exactly one place to
 *      check that the number a client could render as a score does not reach
 *      a client.
 */

/** How much history the model ever needs: four weeks for patterns, plus slack. */
const HISTORY_DAYS = 120;

function toModelCheckIn(row: {
  date: string;
  energy: number;
  detachment: number;
  effectiveness: number;
  sleepHours: number;
  bodyPain: boolean;
  workedLate: boolean;
  recordedAt: Date;
}): CheckIn {
  return {
    date: row.date,
    // The scale columns are plain Ints in the database; the model's `Scale` is
    // a 1–5 union. The API validates the range on write, so this cast is a
    // statement about the write path, not a hope about the data.
    energy: row.energy as CheckIn['energy'],
    detachment: row.detachment as CheckIn['detachment'],
    effectiveness: row.effectiveness as CheckIn['effectiveness'],
    sleepHours: row.sleepHours,
    bodyPain: row.bodyPain,
    workedLate: row.workedLate,
    recordedAt: row.recordedAt.toISOString(),
  };
}

export async function loadHistory(userId: string): Promise<CheckIn[]> {
  const rows = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: HISTORY_DAYS,
  });

  return rows.map(toModelCheckIn);
}

export async function loadWins(
  userId: string,
  take = 20,
): Promise<Array<{ date: string; text: string }>> {
  const rows = await prisma.win.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: { date: true, text: true },
  });

  return rows;
}

/**
 * Everything the home screen renders, in one model run.
 *
 * `signal.strain` is destructured off deliberately — see the file header.
 */
export async function buildHomeSnapshot(userId: string, today: string): Promise<HomeSnapshot> {
  const [user, history, wins] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, anonymous: true },
    }),
    loadHistory(userId),
    loadWins(userId, 5),
  ]);

  const signal = buildSignal(history, today);
  const { strain: _strain, ...publicSignal } = signal;

  return {
    // An anonymous account has no name and is never asked for one. The UI
    // greets with "Good evening" and no comma.
    displayName: user?.anonymous ? null : (user?.name ?? null),
    today,
    checkInDueToday: !history.some((c) => c.date === today),
    signal: publicSignal,
    energySeries: energySeries(history, today),
    careOffered: careOffered(signal),
    recentWins: wins.map((w) => w.text),
  };
}

export async function buildInsight(userId: string, today: string): Promise<WeeklyInsight> {
  const [history, wins] = await Promise.all([loadHistory(userId), loadWins(userId, 50)]);
  return buildWeeklyInsight(history, wins, today);
}
