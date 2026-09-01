'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import styles from './TopBar.module.css';

/**
 * "Recalculate plan" reruns the model and refreshes the server components, so
 * every screen — and the sidebar's LAST RUN line — updates together.
 *
 * The model takes a few seconds in production, so the button reports that it is
 * working rather than appearing to do nothing.
 */
export function TopBar({
  name,
  subtitle,
  periodLabel,
}: {
  name: string;
  subtitle: string;
  periodLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPosting, setIsPosting] = useState(false);

  const busy = isPending || isPosting;

  async function recalculate() {
    setIsPosting(true);
    try {
      const res = await fetch('/api/recalculate', { method: 'POST' });
      if (!res.ok) throw new Error(`Recalculate failed: ${res.status}`);
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <header className={styles.topBar}>
      <div className={styles.identity}>
        <div className={styles.name}>{name}</div>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>

      <div className={styles.actions}>
        <div className={styles.period}>{periodLabel}</div>
        <button
          type="button"
          className={styles.recalculate}
          onClick={recalculate}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Recalculating…' : 'Recalculate plan'}
        </button>
      </div>
    </header>
  );
}
