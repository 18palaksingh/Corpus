import { CRISIS_COPY, screenForCrisis } from '@steady/core';

import { resolveBodyDay, resolveDay } from '@/lib/day';
import { handle, json, preflight, readJson, requireString } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

/**
 * The wins log.
 *
 * Free text, so it is screened for a crisis disclosure exactly like the
 * Unfreezer is — a "wins" box is an odd place to disclose something, and that
 * is precisely why it must not be the one text field that silently swallows
 * it.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    const body = await readJson(request);
    const text = requireString(body, 'text', { min: 2, max: 280 });
    const day = resolveBodyDay(body);

    if (screenForCrisis(text).crisis) {
      await prisma.crisisRouting.create({ data: { userId, surface: 'win', routed: true } });
      return json(request, { crisis: true, copy: CRISIS_COPY }, 200);
    }

    const win = await prisma.win.create({
      data: { userId, date: day, text },
      select: { id: true, date: true, text: true },
    });

    return json(request, { crisis: false, win }, 201);
  });
}

export async function GET(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    // Touch the day param so a malformed one is rejected consistently.
    resolveDay(request);

    const wins = await prisma.win.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, date: true, text: true },
    });

    return json(request, { wins });
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
