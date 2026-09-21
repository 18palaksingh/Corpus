import Link from 'next/link';

import styles from './ui.module.css';

/**
 * Shared primitives.
 *
 * Thin wrappers over the CSS module, so screens read as layout rather than as
 * class-name plumbing, and so a change to what a "card" is happens once.
 */

export function Card({
  children,
  tight = false,
  className = '',
}: {
  children: React.ReactNode;
  tight?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <section className={`${styles.card} ${tight ? styles.cardTight : ''} ${className}`}>
      {children}
    </section>
  );
}

export function Stack({
  children,
  tight = false,
  className = '',
}: {
  children: React.ReactNode;
  tight?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`${tight ? styles.stackTight : styles.stack} ${className}`}>{children}</div>
  );
}

export function Row({
  children,
  between = false,
  className = '',
}: {
  children: React.ReactNode;
  between?: boolean;
  className?: string;
}): React.ReactElement {
  return <div className={`${between ? styles.rowBetween : styles.row} ${className}`}>{children}</div>;
}

export function MetaLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="metaLabel">{children}</span>;
}

export function Caption({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className={styles.caption}>{children}</p>;
}

/**
 * The standing disclaimer.
 *
 * Quiet by default. It appears under anything that says something about how a
 * person is doing, because the deck's "won't do" list starts with diagnosing
 * and this is the sentence that keeps that promise visible.
 */
export function Note({
  children,
  tone = 'quiet',
}: {
  children: React.ReactNode;
  tone?: 'quiet' | 'warn';
}): React.ReactElement {
  return (
    <p className={`${styles.note} ${tone === 'warn' ? styles.noteWarn : ''}`}>{children}</p>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className={styles.error}>{children}</p>;
}

/**
 * A row that navigates — the deck's "Suggested for you ›" pattern.
 *
 * Renders as a real anchor so it is keyboard-reachable and middle-clickable,
 * which a div with an onClick is not.
 */
export function ActionRow({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail?: string;
}): React.ReactElement {
  return (
    <Link href={href} className={styles.actionRow}>
      <span>
        <strong style={{ fontWeight: 500 }}>{title}</strong>
        {detail ? (
          <>
            <br />
            <span className={styles.caption}>{detail}</span>
          </>
        ) : null}
      </span>
      <span className={styles.actionRowChevron} aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className={styles.empty}>{children}</div>;
}

export { styles as ui };
