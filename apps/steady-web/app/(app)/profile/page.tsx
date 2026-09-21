import { AccountPanel } from '@/components/AccountPanel';
import { Card, Caption, MetaLabel, Row, Stack, ui } from '@/components/ui';
import { requirePageUser } from '@/lib/page';
import { prisma } from '@/lib/prisma';
import { signOut } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Account and privacy.
 *
 * The privacy section is not boilerplate and is not a link to a policy. It is
 * the product's central promise written where someone can check it against
 * what the app actually does — the deck's wedge is "individual data never
 * reaches the employer", and a promise only kept in a PDF is not kept.
 */
export default async function ProfilePage(): Promise<React.ReactElement> {
  const { userId } = await requirePageUser();

  const [user, checkIns, wins, unfreezes, devices] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, anonymous: true, createdAt: true },
    }),
    prisma.checkIn.count({ where: { userId } }),
    prisma.win.count({ where: { userId } }),
    prisma.unfreezeSession.count({ where: { userId } }),
    prisma.device.count({ where: { userId } }),
  ]);

  const anonymous = user?.anonymous ?? true;

  return (
    <Stack>
      <header>
        <h1>Account</h1>
        <Caption>
          {anonymous ? 'Anonymous account' : (user?.email ?? user?.name ?? 'Signed in')} · since{' '}
          {user?.createdAt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Caption>
      </header>

      <Card>
        <MetaLabel>Your data</MetaLabel>
        <Row between>
          <div>
            <p className="mono" style={{ fontSize: 'var(--text-title)' }}>
              {checkIns}
            </p>
            <Caption>check-ins</Caption>
          </div>
          <div>
            <p className="mono" style={{ fontSize: 'var(--text-title)' }}>
              {wins}
            </p>
            <Caption>wins</Caption>
          </div>
          <div>
            <p className="mono" style={{ fontSize: 'var(--text-title)' }}>
              {unfreezes}
            </p>
            <Caption>plans</Caption>
          </div>
          <div>
            <p className="mono" style={{ fontSize: 'var(--text-title)' }}>
              {devices}
            </p>
            <Caption>devices</Caption>
          </div>
        </Row>
      </Card>

      <Card>
        <MetaLabel>What Steady does with this</MetaLabel>
        <ul style={{ margin: 'var(--space-md) 0 0', paddingLeft: '1.1em', lineHeight: 1.7 }}>
          <li>Your check-in answers are visible to you and nobody else.</li>
          <li>
            No employer, manager or HR team can see your answers, your signal, or whether you use
            Steady at all.
          </li>
          <li>
            Team reporting is not built. When it is, it will show aggregates over groups of ten or
            more and will never be able to name a person.
          </li>
          <li>Steady does not sell data and runs no third-party trackers.</li>
          <li>Deleting your account deletes everything listed above, immediately.</li>
        </ul>
      </Card>

      <AccountPanel anonymous={anonymous} />

      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/signin' });
        }}
      >
        <button type="submit" className={`${ui.button} ${ui.buttonGhost}`}>
          Sign out
        </button>
      </form>
    </Stack>
  );
}
