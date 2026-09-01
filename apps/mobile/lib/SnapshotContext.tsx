import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Snapshot } from '@corpus/core';

import { fetchSnapshot, recalculate as postRecalculate, type Source } from './api';

/**
 * One snapshot for the whole app.
 *
 * Every tab reads the same payload, so the score on the dashboard and the plan
 * on the investment screen can never disagree — they came out of one model run.
 */
interface SnapshotState {
  snapshot: Snapshot | null;
  source: Source;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  recalculate: () => Promise<void>;
}

const Context = createContext<SnapshotState | null>(null);

export function SnapshotProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [source, setSource] = useState<Source>('cached');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    const result = await fetchSnapshot();
    setSnapshot(result.snapshot);
    setSource(result.source);
    setError(result.error ?? null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const recalculate = useCallback(async () => {
    setRefreshing(true);
    const result = await postRecalculate();
    setSnapshot(result.snapshot);
    setSource(result.source);
    setError(result.error ?? null);
    setRefreshing(false);
  }, []);

  const value = useMemo(
    () => ({ snapshot, source, error, loading, refreshing, refresh, recalculate }),
    [snapshot, source, error, loading, refreshing, refresh, recalculate],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSnapshot(): SnapshotState {
  const value = useContext(Context);
  if (!value) throw new Error('useSnapshot must be used inside a SnapshotProvider');
  return value;
}
