import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** The root is a router, nothing more. */
export default async function RootPage(): Promise<never> {
  const session = await auth();
  redirect(session?.user?.id ? '/today' : '/signin');
}
