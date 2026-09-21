import { handle, json, preflight, readJson, requireBoolean, requireString } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

/**
 * "Did this help you start?"
 *
 * The deck's value metric is "helped me start my task, 70%+ yes", so this is a
 * first-class column rather than an analytics ping. It is asked once, after
 * the timer, and a no is as useful as a yes — the question is phrased so that
 * saying no is not a judgement on the person.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    const body = await readJson(request);
    const id = requireString(body, 'id', { max: 64 });
    const helped = requireBoolean(body, 'helped');

    // Scoped by userId as well as id: an id is guessable in principle, and
    // `updateMany` with both means a guess updates nothing rather than
    // someone else's row.
    const { count } = await prisma.unfreezeSession.updateMany({
      where: { id, userId },
      data: { helped },
    });

    if (count === 0) {
      return json(request, { error: 'No such plan' }, 404);
    }

    return json(request, { ok: true });
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
