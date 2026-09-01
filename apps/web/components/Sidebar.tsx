'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { SyncSummary } from '@corpus/core';
import { timestampLabel } from '@corpus/core';

import { NAV } from './nav';
import styles from './Sidebar.module.css';

export function Sidebar({ sync }: { sync: SyncSummary }) {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar} aria-label="Workspace">
      <Link href="/dashboard" className={styles.logo}>
        <span className={styles.mark} aria-hidden />
        <span className={styles.wordmark}>Corpus</span>
      </Link>

      <div className={styles.navGroup}>
        <div className={`microLabel ${styles.navLabel}`}>WORKSPACE</div>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={`${styles.indicator} ${active ? styles.indicatorActive : ''}`}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={`microLabel ${styles.footerLabel}`}>LAST RUN</div>
        <div className={styles.footerTime}>{timestampLabel(sync.lastRunAt)}</div>
        <div className={styles.footerSummary}>{sync.summary}</div>
      </div>
    </nav>
  );
}
