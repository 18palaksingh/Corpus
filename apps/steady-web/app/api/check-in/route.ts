import { prisma } from '@/lib/prisma';
import { resolveBodyDay, resolveDay } from '@/lib/day';
import {
  handle,
  json,
  preflight,
  readJson,
  requireBoolean,
  requireInt,
  requireNumber,
} from '@/lib/http';
import { buildHomeSnapshot } from '@/lib/queries';
import { requireUser } from '@/lib/session';

/**
 * The pulse check-in.
 *
 * POST records today's answers and returns the recomputed home snapshot, so
 * the client never has to fetch twice and can never render a band computed
 * from a state the server has already moved past.
 *
 * Re-submitting the same day updates it rather than erroring. People correct a
 * mistap, and "you already checked in today" as a hard failure would be a
 * pointless wall in front of someone who came back to fix something.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    const body = await readJson(request);

    const day = resolveBodyDay(body);
    const answers = {
      energy: requireInt(body, 'energy', 1, 5),
      detachment: requireInt(body, 'detachment', 1, 5),
      effectiveness: requireInt(body, 'effectiveness', 1, 5),
      sleepHours: requireNumber(body, 'sleepHours', 0, 14),
      bodyPain: requireBoolean(body, 'bodyPain'),
      workedLate: requireBoolean(body, 'workedLate'),
    };

    await prisma.checkIn.upsert({
      where: { userId_date: { userId, date: day } },
      create: { userId, date: day, ...answers },
      update: { ...answers, recordedAt: new Date() },
    });

    return json(request, await buildHomeSnapshot(userId, day), 201);
  });
}

/** Today's answers, so the check-in screen can show what was already said. */
export async function GET(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    const day = resolveDay(request);

    const existing = await prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: day } },
      select: {
        energy: true,
        detachment: true,
        effectiveness: true,
        sleepHours: true,
        bodyPain: true,
        workedLate: true,
      },
    });

    return json(request, { day, checkIn: existing });
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
