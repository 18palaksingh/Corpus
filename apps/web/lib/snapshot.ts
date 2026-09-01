import 'server-only';

import { ANANYA, buildSnapshot, type Snapshot, type UserInput } from '@corpus/core';

/**
 * Server-side data access.
 *
 * The model runs here, never in the browser. Swapping this for a real database
 * and the signed-in user is the only change needed to move off the reference
 * persona — every screen reads `Snapshot` and nothing else.
 */

/** Stands in for the row a real deployment would load per user. */
const STORE = new Map<string, UserInput>([['ananya', ANANYA]]);

export const DEMO_USER_ID = 'ananya';

export async function getUser(userId: string = DEMO_USER_ID): Promise<UserInput> {
  const user = STORE.get(userId);
  if (!user) throw new Error(`No such user: ${userId}`);
  return user;
}

export async function getSnapshot(userId: string = DEMO_USER_ID): Promise<Snapshot> {
  return buildSnapshot(await getUser(userId));
}

/**
 * Re-runs the model and stamps a new "last run" time — what the top bar's
 * "Recalculate plan" button triggers. A real implementation would re-pull the
 * bank and card feeds first; the model itself is already a pure function of
 * whatever those return.
 */
export async function recalculate(userId: string = DEMO_USER_ID): Promise<Snapshot> {
  const user = await getUser(userId);
  const refreshed: UserInput = { ...user, lastRunAt: new Date().toISOString() };
  STORE.set(userId, refreshed);
  return buildSnapshot(refreshed);
}

/**
 * Applies an income change and reruns the model.
 *
 * The plan, the score, the limits and every projection move together, because
 * they are all derived from the same input — there is nothing to invalidate.
 */
export async function updateIncome(
  income: UserInput['income'],
  userId: string = DEMO_USER_ID,
): Promise<Snapshot> {
  const user = await getUser(userId);
  const updated: UserInput = { ...user, income, lastRunAt: new Date().toISOString() };
  STORE.set(userId, updated);
  return buildSnapshot(updated);
}
