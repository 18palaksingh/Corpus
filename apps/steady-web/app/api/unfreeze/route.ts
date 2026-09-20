import { CRISIS_COPY, planTask, screenForCrisis } from '@steady/core';

import { handle, json, preflight, readJson, requireString } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

/**
 * The Task Unfreezer.
 *
 * ## Order of operations, which is the whole point of this route
 *
 * The crisis screen runs **first**, before anything looks at the text as a
 * task. If it trips, the request returns the crisis surface and no plan is
 * generated, nothing is stored, and the response never carries three steps
 * for a spreadsheet. Handing someone a project plan thirty seconds after they
 * disclosed something serious is the single worst thing this product could
 * do, and the only way to be sure it cannot happen is for the planner never
 * to run.
 *
 * The audit row records that a routing happened and on which surface. It does
 * not record what was typed — see the privacy note in `schema.prisma`.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    const body = await readJson(request);
    const task = requireString(body, 'task', { min: 1, max: 2000 });

    const screen = screenForCrisis(task);
    if (screen.crisis) {
      await prisma.crisisRouting.create({
        data: { userId, surface: 'unfreeze', routed: true },
      });

      return json(request, { crisis: true, copy: CRISIS_COPY }, 200);
    }

    const plan = planTask(task);
    if (!plan) {
      return json(
        request,
        { crisis: false, plan: null, message: 'Paste a bit more of the task and try again.' },
        200,
      );
    }

    const saved = await prisma.unfreezeSession.create({
      data: {
        userId,
        task: plan.task,
        shape: plan.shape,
        steps: JSON.stringify(plan.steps),
      },
      select: { id: true },
    });

    return json(request, { crisis: false, id: saved.id, plan }, 201);
  });
}

/** The last few plans, so someone can pick up where they left off. */
export async function GET(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);

    const rows = await prisma.unfreezeSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, task: true, shape: true, steps: true, helped: true, createdAt: true },
    });

    return json(request, {
      sessions: rows.map((row) => ({
        id: row.id,
        task: row.task,
        shape: row.shape,
        steps: JSON.parse(row.steps) as string[],
        helped: row.helped,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
