import Constants from 'expo-constants';

import type { Snapshot } from '@corpus/core';

import lastKnown from './last-known-snapshot.json';

/**
 * Reading the snapshot.
 *
 * The model runs on the server, so the app's job is to fetch a snapshot and
 * render it. When the network is unavailable we fall back to the last known
 * payload rather than showing an empty screen — but we say so, because a
 * financial plan the user believes is current when it is not is worse than no
 * plan at all.
 */

const FALLBACK = lastKnown as unknown as Snapshot;

/** Configured in app.json; point it at the deployed web app. */
export function apiBaseUrl(): string {
  const configured = Constants.expoConfig?.extra?.['apiBaseUrl'];
  return typeof configured === 'string' ? configured : 'http://localhost:3000';
}

export type Source = 'live' | 'cached';

export interface SnapshotResult {
  snapshot: Snapshot;
  source: Source;
  /** Why we fell back, when we did. */
  error?: string;
}

const TIMEOUT_MS = 8000;

export async function fetchSnapshot(): Promise<SnapshotResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${apiBaseUrl()}/api/snapshot`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    return { snapshot: (await res.json()) as Snapshot, source: 'live' };
  } catch (error) {
    return {
      snapshot: FALLBACK,
      source: 'cached',
      error: error instanceof Error ? error.message : 'Could not reach Corpus.',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Reruns the model on the server, then returns the fresh snapshot. */
export async function recalculate(): Promise<SnapshotResult> {
  try {
    const res = await fetch(`${apiBaseUrl()}/api/recalculate`, { method: 'POST' });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    return { snapshot: (await res.json()) as Snapshot, source: 'live' };
  } catch (error) {
    return {
      snapshot: FALLBACK,
      source: 'cached',
      error: error instanceof Error ? error.message : 'Could not reach Corpus.',
    };
  }
}

export async function approvePlan(
  scheduledFor: string,
  actions: { kind: string; amount: number }[],
): Promise<void> {
  const res = await fetch(`${apiBaseUrl()}/api/plan/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduledFor, actions }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Approval failed (${res.status}).`);
  }
}
