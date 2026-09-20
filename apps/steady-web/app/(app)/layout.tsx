import { redirect } from 'next/navigation';

import { Nav } from '@/components/Nav';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import styles from './layout.module.css';

/**
 * The signed-in shell.
 *
 * Every route in this group requires a session, checked here rather than in
 * each page — a page that forgets the check is a page that leaks someone
 * else's week, and the group boundary is the one place that cannot be
 * forgotten.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, anonymous: true },
  });

  // An anonymous account has nothing to display, and inventing a label
  // ("User 4821") would undercut the promise. It says what it is.
  const accountLabel = user?.anonymous
    ? 'Anonymous'
    : (user?.name ?? user?.email ?? 'Signed in');

  return (
    <div className={styles.shell}>
      <Nav accountLabel={accountLabel} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
