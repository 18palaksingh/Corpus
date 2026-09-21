import { NOT_A_DIAGNOSIS } from '@steady/core';

import { Card, Caption, Empty, MetaLabel, Note, Row, Stack, ui } from '@/components/ui';
import { WinForm } from '@/components/WinForm';
import { requirePageUser } from '@/lib/page';
import { buildInsight } from '@/lib/queries';

export const dynamic = 'force-dynamic';

function formatRange(from: string, to: string): string {
  const fmt = (day: string): string =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

/**
 * "Your week, in brief."
 *
 * Patterns, wins and one small experiment. Note what is absent: there is no
 * streak, no completion percentage rendered as a goal, and no comparison to
 * other people. The deck's "won't do" list names guilt-driven streaks
 * explicitly, and a check-in count shown as "6/7" with a target next to it is
 * a streak wearing a different hat.
 */
export default async function WeekPage(): Promise<React.ReactElement> {
  const { userId, today } = await requirePageUser();
  const insight = await buildInsight(userId, today);

  const delta = insight.energyDeltaPercent;

  return (
    <Stack>
      <header>
        <h1>Your week, in brief</h1>
        <Caption>{formatRange(insight.from, insight.to)}</Caption>
      </header>

      <Card>
        <Row between>
          <div>
            <MetaLabel>Energy</MetaLabel>
            <p className="mono" style={{ fontSize: 'var(--text-heading)' }}>
              {delta === null ? '—' : `${delta > 0 ? '↑' : delta < 0 ? '↓' : ''} ${Math.abs(delta)}%`}
            </p>
            <Caption>
              {delta === null ? 'No previous week to compare against yet' : 'vs. last week'}
            </Caption>
          </div>
          <div>
            <MetaLabel>Check-ins</MetaLabel>
            <p className="mono" style={{ fontSize: 'var(--text-heading)' }}>
              {insight.checkInCount} / {insight.windowDays}
            </p>
          </div>
        </Row>
      </Card>

      {insight.pattern ? (
        <Card>
          <MetaLabel>Pattern we noticed</MetaLabel>
          <p style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-body-large)' }}>
            {insight.pattern}
          </p>
        </Card>
      ) : null}

      <Card>
        <MetaLabel>Wins this week</MetaLabel>
        {insight.wins.length > 0 ? (
          <ul style={{ margin: 'var(--space-md) 0 var(--space-xl)', paddingLeft: '1.1em' }}>
            {insight.wins.map((win) => (
              <li key={win} style={{ marginBottom: 4 }}>
                {win}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            Nothing logged yet. A win can be small — &ldquo;asked two clarifying questions&rdquo;
            counts.
          </Empty>
        )}
        <WinForm day={today} />
      </Card>

      <Card>
        <MetaLabel>Try this next week</MetaLabel>
        <p style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-body-large)' }}>
          {insight.experiment}
        </p>
        <p className={ui.caption} style={{ marginTop: 'var(--space-md)' }}>
          One small thing, two days. Not a rule, and nothing tracks whether you did it.
        </p>
      </Card>

      <Note>{NOT_A_DIAGNOSIS}</Note>
    </Stack>
  );
}
