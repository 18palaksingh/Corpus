import { NOT_A_DIAGNOSIS } from '@steady/core';
import Link from 'next/link';

import { SignalCard } from '@/components/SignalCard';
import { ActionRow, Card, Caption, MetaLabel, Note, Stack, ui } from '@/components/ui';
import { requirePageUser } from '@/lib/page';
import { buildHomeSnapshot } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** Greeting by wall-clock hour, in the person's own timezone. */
function greeting(timezone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: 'numeric', hour12: false }).format(
      new Date(),
    ),
  );

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Where the model's suggested action points. */
const SUGGESTION_HREF: Record<string, string> = {
  'check-in': '/pulse',
  reset: '/reset',
  unfreeze: '/unfreeze',
  insight: '/week',
  care: '/care',
};

/**
 * Home.
 *
 * The deck's rule for this screen: a band, one next action, never a wall of
 * content. The suggestion is chosen by the model, not by this page, so the
 * ordering logic lives somewhere testable rather than in JSX.
 */
export default async function TodayPage(): Promise<React.ReactElement> {
  const { userId, today, timezone } = await requirePageUser();
  const snapshot = await buildHomeSnapshot(userId, today);
  const { signal } = snapshot;

  return (
    <Stack>
      <header>
        <h1>
          {greeting(timezone)}
          {snapshot.displayName ? `, ${snapshot.displayName}` : ''}
        </h1>
      </header>

      <SignalCard snapshot={snapshot} />

      {snapshot.careOffered ? (
        <Card>
          <MetaLabel>Support</MetaLabel>
          <h2 style={{ marginTop: 'var(--space-sm)' }}>Let&rsquo;s get you support</h2>
          <p className={ui.muted} style={{ marginTop: 'var(--space-sm)' }}>
            {signal.suggestion.reason}
          </p>
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <Link href="/care" className={`${ui.button} ${ui.buttonFull}`}>
              See the options
            </Link>
          </div>
        </Card>
      ) : null}

      <Stack tight>
        <MetaLabel>Suggested for you</MetaLabel>
        <ActionRow
          href={SUGGESTION_HREF[signal.suggestion.kind] ?? '/today'}
          title={signal.suggestion.label}
          detail={signal.suggestion.reason}
        />
        {/*
          Exactly one more, and only when it is not what was just suggested.
          Two choices is a decision; five is a homepage, and a person who is
          frozen does not need a homepage.
        */}
        {signal.suggestion.kind !== 'unfreeze' ? (
          <ActionRow
            href="/unfreeze"
            title="Unfreeze a task"
            detail="Paste the thing you are stuck on and get a first step."
          />
        ) : (
          <ActionRow
            href="/reset"
            title="90-sec blank-mind reset"
            detail="One tap, works offline."
          />
        )}
      </Stack>

      {snapshot.recentWins.length > 0 ? (
        <Card>
          <MetaLabel>Recent wins</MetaLabel>
          <ul style={{ margin: 'var(--space-md) 0 0', paddingLeft: '1.1em' }}>
            {snapshot.recentWins.map((win) => (
              <li key={win} style={{ marginBottom: 4 }}>
                {win}
              </li>
            ))}
          </ul>
          <Caption>
            <Link href="/week">Add one from this week</Link>
          </Caption>
        </Card>
      ) : null}

      <Note>{NOT_A_DIAGNOSIS}</Note>
    </Stack>
  );
}
