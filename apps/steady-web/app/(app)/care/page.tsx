import {
  CARE_COMMISSION_DISCLOSURE,
  CARE_INTRO,
  CARE_OPTIONS,
  CARE_PARTNERS,
  CARE_PARTNERS_ARE_PLACEHOLDERS,
  TELE_MANAS,
} from '@steady/core';

import { Card, Caption, MetaLabel, Note, Stack, ui } from '@/components/ui';
import { requirePageUser } from '@/lib/page';
import { buildHomeSnapshot } from '@/lib/queries';

import styles from './care.module.css';

export const dynamic = 'force-dynamic';

/**
 * The bridge to humans.
 *
 * Two rules from the deck govern this screen:
 *
 *   1. **Escalation is gentle.** No alarm, no "you need help", no red banner.
 *      The options are listed as things a reasonable person might choose, and
 *      the copy makes clear you do not have to be in crisis to pick one.
 *   2. **The crisis line is always one tap away.** It is rendered first and
 *      unconditionally — not behind the red band, not behind a session, not at
 *      the bottom of the page. Someone arriving here on their worst day should
 *      not have to scroll.
 */
export default async function CarePage(): Promise<React.ReactElement> {
  const { userId, today } = await requirePageUser();
  const snapshot = await buildHomeSnapshot(userId, today);

  return (
    <Stack>
      <header>
        <h1>Let&rsquo;s get you support</h1>
        {snapshot.careOffered ? (
          <Caption>{snapshot.signal.suggestion.reason}</Caption>
        ) : (
          <Caption>{CARE_INTRO}</Caption>
        )}
      </header>

      <section className={styles.crisis}>
        <span className={styles.crisisLabel}>Need help right now?</span>
        <a className={styles.crisisCall} href={`tel:${TELE_MANAS.phone}`}>
          Call {TELE_MANAS.name} {TELE_MANAS.phone}
        </a>
        <span className={styles.crisisDetail}>{TELE_MANAS.detail}</span>
      </section>

      <Stack tight>
        {CARE_OPTIONS.map((option) => (
          <Card key={option.kind} tight>
            <strong>{option.title}</strong>
            <Caption>{option.detail}</Caption>
          </Card>
        ))}
      </Stack>

      <Card>
        <MetaLabel>Therapists</MetaLabel>

        {CARE_PARTNERS_ARE_PLACEHOLDERS ? (
          <Note tone="warn">
            These are placeholder entries for building and reviewing this screen — not real
            practitioners. Real partners, with verified registrations and a referral agreement,
            replace them before anyone outside the team sees this.
          </Note>
        ) : null}

        <ul className={styles.partners}>
          {CARE_PARTNERS.map((partner) => (
            <li key={partner.name} className={styles.partner}>
              <div>
                <strong>{partner.name}</strong>
                <Caption>{partner.credential}</Caption>
                <Caption>{partner.focus}</Caption>
                <Caption>
                  {partner.languages.join(', ')} · {partner.modes.join(' and ')}
                </Caption>
              </div>
              <span className={`mono ${styles.price}`}>₹{partner.firstSessionInr}</span>
            </li>
          ))}
        </ul>

        <p className={ui.caption} style={{ marginTop: 'var(--space-lg)' }}>
          {CARE_COMMISSION_DISCLOSURE}
        </p>
      </Card>

      <Note>
        Steady is not a crisis service and does not provide therapy. If you are in danger right
        now, call {TELE_MANAS.phone} or your local emergency number.
      </Note>
    </Stack>
  );
}
