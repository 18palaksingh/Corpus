import { resolveDay } from '@/lib/day';
import { handle, json, preflight } from '@/lib/http';
import { buildHomeSnapshot } from '@/lib/queries';
import { requireUser } from '@/lib/session';

/**
 * The home screen, for both clients.
 *
 * The web app renders this server-side; the Android app GETs it. Same model
 * run, same shape, so the band on a phone and the band in a browser are the
 * same band.
 */
export async function GET(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);
    const snapshot = await buildHomeSnapshot(userId, resolveDay(request));
    return json(request, snapshot);
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
