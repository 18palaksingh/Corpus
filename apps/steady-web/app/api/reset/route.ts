import { buildResetScript } from '@steady/core';

import { handle, json, preflight, readJson, requireBoolean, requireInt } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

/**
 * The blank-mind reset.
 *
 * GET needs no authentication: the reset is ninety seconds of breathing, it
 * works offline, and putting a sign-in wall in front of the calm-down button
 * would be a small cruelty. POST records that one happened, which does.
 */
export function GET(request: Request): Response {
  return json(request, buildResetScript());
}

export async function POST(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    const body = await readJson(request);

    await prisma.resetSession.create({
      data: {
        userId,
        completed: requireBoolean(body, 'completed'),
        secondsHeld: requireInt(body, 'secondsHeld', 0, 600),
      },
    });

    return json(request, { ok: true }, 201);
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
