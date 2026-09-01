import Link from 'next/link';

import type { Alert } from '@corpus/core';
import { color } from '@corpus/core';

import { SCREEN_HREF } from './nav';
import p from './primitives.module.css';
import s from './Dashboard.module.css';

/** Dot colour encodes urgency: red urgent, amber advisory, green opportunity. */
const DOT: Record<Alert['severity'], string> = {
  urgent: color.negative,
  advisory: color.warning,
  opportunity: color.positive,
};

export function AlertsCard({ alerts }: { alerts: Alert[] }) {
  return (
    <section className={`${p.card} ${p.cardFlush}`} aria-label="Needs your attention">
      <h2 className={s.alertsHeading} style={{ margin: 0 }}>
        Needs your attention
      </h2>

      {alerts.map((alert) => {
        const body = (
          <>
            <span className={s.dot} style={{ background: DOT[alert.severity] }} aria-hidden />
            <div className={s.alertText}>
              <div className={s.alertTitle}>{alert.title}</div>
              <div className={s.alertBody}>{alert.body}</div>
            </div>
          </>
        );

        // An alert with somewhere to go is a link; one without stays inert
        // rather than looking clickable and doing nothing.
        return alert.linkTo ? (
          <Link key={alert.id} href={SCREEN_HREF[alert.linkTo]} className={s.alertRow}>
            {body}
          </Link>
        ) : (
          <div key={alert.id} className={s.alertRow}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
