import { handle, json, preflight } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { mintPairingCode, requireUser } from '@/lib/session';

/** Codes are short, so they expire fast. */
const TTL_MINUTES = 10;

/**
 * Issue a pairing code.
 *
 * Called from the web app by a signed-in person who wants their phone on the
 * same account.
 *
 * ## Why a code and not OAuth on the phone
 *
 * Google sign-in inside a React Native app means a custom URL scheme, a
 * redirect URI per build variant, and a client id that has to be right in the
 * APK before anyone can test anything. A six-digit code needs none of that:
 * sign in wherever signing in already works, then type six digits into the
 * phone. It also degrades honestly — if pairing breaks, the phone keeps
 * working as an anonymous account rather than locking someone out.
 *
 * The code is weak by design (six digits, readable across a desk), so the
 * security lives in the TTL, single use, and the rate limit on redeem.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(request, async () => {
    const { userId } = await requireUser(request);

    // One live code per person: issuing a new one invalidates the last, so a
    // code left on a screen an hour ago cannot still be used.
    await prisma.pairingCode.deleteMany({ where: { userId, consumedAt: null } });

    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000);

    // Collisions are possible across the whole table, so retry a few times
    // rather than handing the caller a 500 on a one-in-a-million clash.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = mintPairingCode();
      try {
        await prisma.pairingCode.create({ data: { code, userId, expiresAt } });
        return json(request, { code, expiresAt: expiresAt.toISOString() }, 201);
      } catch {
        // Taken — try another.
      }
    }

    return json(request, { error: 'Could not issue a code, try again' }, 503);
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
