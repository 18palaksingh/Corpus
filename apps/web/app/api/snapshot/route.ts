import { NextResponse } from 'next/server';

import { getSnapshot } from '@/lib/snapshot';

/**
 * The snapshot the mobile app reads.
 *
 * Both clients render the same payload, so the two apps cannot drift: a change
 * to the model shows up on web and mobile at once.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await getSnapshot();
  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
