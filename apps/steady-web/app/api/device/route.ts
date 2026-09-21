import { handle, json, optionalString, preflight, readJson } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { hashToken, mintDeviceToken, requireUser } from '@/lib/session';

/**
 * Anonymous sign-up, for the Android app.
 *
 * The phone POSTs once on first launch with no credentials at all and gets
 * back a bearer token and a fresh anonymous account. There is no email, no
 * OAuth round-trip, no browser hand-off — the deck's Ananya "downloads without
 * giving her name", and this is that, implemented.
 *
 * ## What this costs, stated honestly
 *
 * An unauthenticated POST that creates a row is a spam surface. The MVP
 * accepts that: the row is tiny, the endpoint does nothing else, and gating
 * first launch behind a captcha would defeat the entire point of the screen.
 * Before any real launch this wants a rate limit at the edge — it is called
 * once per install, so a limit low enough to be useful will not touch a real
 * user.
 *
 * ## Recovery
 *
 * An anonymous account lives and dies with its token. Lose the phone and the
 * history is gone, because there is nothing to prove it was yours — that is
 * what anonymous means, and the app says so on the profile screen rather than
 * letting someone discover it later. `/api/pair` is the way out: sign in on
 * the web, pair the phone, and the account becomes recoverable.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(request, async () => {
    const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);
    const label = optionalString(body, 'label', 60) ?? 'Android';
    const timezone = optionalString(body, 'timezone', 60) ?? 'Asia/Kolkata';

    const token = mintDeviceToken();

    const user = await prisma.user.create({
      data: {
        anonymous: true,
        timezone,
        devices: { create: { tokenHash: hashToken(token), label } },
      },
      select: { id: true },
    });

    return json(request, { token, userId: user.id, anonymous: true }, 201);
  });
}

/** Who this token belongs to — the app's "am I still signed in" check. */
export async function GET(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, anonymous: true, timezone: true },
    });

    return json(request, {
      userId,
      name: user?.name ?? null,
      email: user?.email ?? null,
      anonymous: user?.anonymous ?? true,
      timezone: user?.timezone ?? 'Asia/Kolkata',
    });
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
