import { resolveDay } from '@/lib/day';
import { handle, json, preflight } from '@/lib/http';
import { buildInsight } from '@/lib/queries';
import { requireUser } from '@/lib/session';

/** "Your week, in brief". */
export async function GET(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    return json(request, await buildInsight(userId, resolveDay(request)));
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
