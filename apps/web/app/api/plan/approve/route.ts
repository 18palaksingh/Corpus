import { NextResponse } from 'next/server';

import type { PlanActionKind } from '@corpus/core';

import { getSnapshot } from '@/lib/snapshot';

interface ApprovalRequest {
  scheduledFor: string;
  actions: { kind: PlanActionKind; amount: number }[];
}

/**
 * Commits the month's plan.
 *
 * This is the one endpoint that moves real money, so it re-derives the
 * investable pool server-side and refuses anything that does not reconcile
 * against it. A client that has been tampered with, or that is a plan
 * generation behind, cannot schedule more than the model allowed.
 */
export async function POST(request: Request) {
  let body: ApprovalRequest;
  try {
    body = (await request.json()) as ApprovalRequest;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  if (!Array.isArray(body.actions) || body.actions.length === 0) {
    return NextResponse.json({ error: 'No actions to approve.' }, { status: 400 });
  }

  if (body.actions.some((a) => !Number.isFinite(a.amount) || a.amount < 0)) {
    return NextResponse.json({ error: 'Amounts must be positive numbers.' }, { status: 400 });
  }

  const snapshot = await getSnapshot();

  if (body.scheduledFor !== snapshot.plan.scheduledFor) {
    return NextResponse.json(
      { error: 'This plan is out of date. Reload and try again.' },
      { status: 409 },
    );
  }

  const total = body.actions.reduce((sum, a) => sum + a.amount, 0);
  if (total !== snapshot.plan.investable) {
    return NextResponse.json(
      {
        error: `Actions must total the investable pool of ${snapshot.plan.investable}, received ${total}.`,
      },
      { status: 422 },
    );
  }

  // A real deployment books each instruction with the broker, the lender and
  // the bank here, and records the approval against the period.
  return NextResponse.json({
    status: 'scheduled',
    scheduledFor: snapshot.plan.scheduledFor,
    actions: body.actions,
  });
}
