import { NextResponse } from 'next/server';

import { recalculate } from '@/lib/snapshot';

/** Reruns the model and stamps a new "last run" time. */
export async function POST() {
  const snapshot = await recalculate();
  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
