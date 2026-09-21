import { handle, json, preflight } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

/**
 * The account, and the way out of it.
 *
 * DELETE removes everything: check-ins, wins, plans, resets, devices, the
 * account itself. It cascades at the schema level, so there is no list of
 * tables here to fall out of date when a table is added.
 *
 * This endpoint is not a nice-to-have. A product that asks people to record
 * how bad their week was, and promises their employer will never see it, has
 * to be a product they can leave completely — and under the DPDP Act 2023,
 * which the deck commits to, erasure is a right rather than a courtesy.
 *
 * The crisis audit rows survive, with their user link set to null by the
 * schema's `onDelete: SetNull`. They hold no text and no identity — only that
 * a routing happened, on which surface, on which date. Keeping them is what
 * allows the 100% guardrail to be audited at all, and deleting them would let
 * a routing failure be erased by the person it failed.
 */
export async function DELETE(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    await prisma.user.delete({ where: { id: userId } });
    return json(request, { ok: true, deleted: true });
  });
}

export async function GET(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId, via } = await requireUser(request);

    const [user, counts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, anonymous: true, timezone: true, createdAt: true },
      }),
      Promise.all([
        prisma.checkIn.count({ where: { userId } }),
        prisma.win.count({ where: { userId } }),
        prisma.unfreezeSession.count({ where: { userId } }),
        prisma.device.count({ where: { userId } }),
      ]),
    ]);

    const [checkIns, wins, unfreezes, devices] = counts;

    return json(request, {
      userId,
      via,
      name: user?.name ?? null,
      email: user?.email ?? null,
      anonymous: user?.anonymous ?? true,
      timezone: user?.timezone ?? 'Asia/Kolkata',
      since: user?.createdAt.toISOString() ?? null,
      counts: { checkIns, wins, unfreezes, devices },
    });
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
