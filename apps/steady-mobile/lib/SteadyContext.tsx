import type { HomeSnapshot } from '@steady/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ensureDevice, fetchHome, OfflineError, readCachedSnapshot } from './api';

/**
 * The app's one piece of shared state: the home snapshot, and how old it is.
 *
 * ## The rule this file exists to enforce
 *
 * When the server cannot be reached, the app shows the **last snapshot it
 * actually fetched, labelled as stale** — never a silently old one. The deck
 * promises a signal people can act on; a band someone believes is current when
 * it is nine days old would make the product actively misleading on exactly
 * the week it matters most.
 *
 * So `stale` is part of the state, every screen that renders the signal reads
 * it, and `fetchedAt` says when.
 */

interface SteadyState {
  snapshot: HomeSnapshot | null;
  /** True while the very first load is in flight and nothing is on screen. */
  loading: boolean;
  /** True when what is displayed came from the cache, not from the server. */
  stale: boolean;
  /** When `snapshot` was fetched from the server. */
  fetchedAt: string | null;
  /** Set when the last refresh failed for a reason that is not "offline". */
  error: string | null;
  refresh: () => Promise<void>;
  /** Replace the snapshot from a response that already returned a fresh one. */
  apply: (snapshot: HomeSnapshot) => void;
}

const SteadyContext = createContext<SteadyState | null>(null);

export function SteadyProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      await ensureDevice();
      const fresh = await fetchHome();

      setSnapshot(fresh);
      setStale(false);
      setFetchedAt(new Date().toISOString());
    } catch (cause) {
      if (cause instanceof OfflineError) {
        // Fall back to the cache, and say so. If there is no cache there is
        // genuinely nothing to show, and the screen says that instead.
        const cached = await readCachedSnapshot();
        if (cached) {
          setSnapshot(cached.snapshot);
          setFetchedAt(cached.fetchedAt);
          setStale(true);
        } else {
          setError('Could not reach Steady. Check your connection and pull to refresh.');
        }
      } else {
        setError(cause instanceof Error ? cause.message : 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apply = useCallback((fresh: HomeSnapshot) => {
    setSnapshot(fresh);
    setStale(false);
    setFetchedAt(new Date().toISOString());
  }, []);

  const value = useMemo(
    () => ({ snapshot, loading, stale, fetchedAt, error, refresh, apply }),
    [snapshot, loading, stale, fetchedAt, error, refresh, apply],
  );

  return <SteadyContext.Provider value={value}>{children}</SteadyContext.Provider>;
}

export function useSteady(): SteadyState {
  const value = useContext(SteadyContext);
  if (!value) throw new Error('useSteady must be used inside SteadyProvider');
  return value;
}

/** "3 days ago" for the stale banner. */
export function describeAge(iso: string | null): string {
  if (!iso) return 'a while ago';

  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
