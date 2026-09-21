import 'server-only';

import { redirect } from 'next/navigation';

import { auth } from './auth';
import { serverDay } from './day';
import { prisma } from './prisma';

/**
 * Page-side equivalent of `requireUser`.
 *
 * Server components cannot read an `Authorization` header from the browser, so
 * pages go through the session only — the bearer-token path exists for the
 * Android app, which talks to the API and never renders these pages.
 *
 * Returns the person's timezone alongside the id, so a page can ask the model
 * for *their* today rather than the server's.
 */
export async function requirePageUser(): Promise<{
  userId: string;
  today: string;
  timezone: string;
}> {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });

  // The session survived but the row did not — an account deleted in another
  // tab. Send them back to sign-in rather than rendering a ghost account.
  if (!user) redirect('/signin');

  const timezone = user.timezone || 'Asia/Kolkata';

  return { userId: session.user.id, today: serverDay(timezone), timezone };
}
