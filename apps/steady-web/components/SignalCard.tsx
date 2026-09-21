import { daysEndingAt, signalColor, type HomeSnapshot } from '@steady/core';

import styles from './SignalCard.module.css';

const BAND_LABEL: Record<string, string> = {
  green: 'Green',
  amber: 'Amber',
  red: 'Red',
  unknown: 'Not yet',
};

/**
 * The band, the evidence, the week.
 *
 * What this component deliberately does not render:
 *
 *   - a number out of a hundred;
 *   - a breakdown by dimension;
 *   - a comparison against other users.
 *
 * The band plus one checkable fact is the whole of what Steady claims to know.
 * Anything more specific would be a clinical claim the model cannot support,
 * and anything comparative would turn a private signal into a ranking.
 */
export function SignalCard({ snapshot }: { snapshot: HomeSnapshot }): React.ReactElement {
  const { signal, energySeries, today } = snapshot;
  const palette = signalColor[signal.band];
  const days = daysEndingAt(today, energySeries.length);

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div>
          <span className="metaLabel">Burnout signal</span>
          <p className={styles.evidence}>
            {signal.confident
              ? signal.evidence
              : `${signal.checkInCount} of ${signal.windowDays} days checked in. A few more and Steady can tell you what it is seeing.`}
          </p>
        </div>
        <span
          className={styles.band}
          style={{ background: palette.bg, color: palette.fg }}
        >
          <span className={styles.dot} />
          {BAND_LABEL[signal.band]}
        </span>
      </div>

      <div className={styles.series} aria-hidden="true">
        {energySeries.map((energy, index) => (
          <div className={styles.slot} key={days[index] ?? index}>
            {energy === null ? (
              <span className={styles.gap} />
            ) : (
              <span
                className={styles.bar}
                // Energy is 1–5; the floor keeps a "1" visible as a bar rather
                // than a sliver indistinguishable from a missing day.
                style={{ height: `${20 + ((energy - 1) / 4) * 80}%` }}
              />
            )}
          </div>
        ))}
      </div>

      <div className={styles.axis} aria-hidden="true">
        {days.map((day) => (
          <span className={styles.axisLabel} key={day}>
            {new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
              weekday: 'narrow',
              timeZone: 'UTC',
            })}
          </span>
        ))}
      </div>

      <p className="metaLabel" style={{ marginTop: 'var(--space-md)' }}>
        Last {signal.windowDays} days · energy
      </p>
    </section>
  );
}
