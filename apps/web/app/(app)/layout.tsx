import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { getSnapshot } from '@/lib/snapshot';

import styles from './layout.module.css';

/**
 * The snapshot reflects mutable state — the profile's income fields and the
 * "Recalculate plan" button both change it — so every screen renders per
 * request rather than being prerendered at build time.
 */
export const dynamic = 'force-dynamic';

/**
 * The shell every screen sits in: a sticky sidebar and a sticky top bar, both
 * identical across all five screens.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const snapshot = await getSnapshot();

  return (
    <div className={styles.shell}>
      <Sidebar sync={snapshot.sync} />
      <div className={styles.main}>
        <TopBar
          name={snapshot.user.name}
          subtitle={snapshot.user.subtitle}
          periodLabel={snapshot.period.label}
        />
        {children}
      </div>
    </div>
  );
}
