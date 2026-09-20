'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV } from './nav';
import styles from './Nav.module.css';

/**
 * The app's navigation.
 *
 * A client component only because it needs the current path to mark the active
 * destination — everything it renders is otherwise static.
 */
export function Nav({ accountLabel }: { accountLabel: string }): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Steady">
      <span className={styles.brand}>Steady</span>

      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${active ? styles.active : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.indicator} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}

      <div className={styles.footer}>
        <span className={styles.footerLabel}>Signed in as</span>
        <span className={styles.footerValue}>{accountLabel}</span>
        <Link href="/profile" className={styles.footerLink}>
          Account and privacy
        </Link>
      </div>
    </nav>
  );
}
