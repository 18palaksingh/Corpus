import { handle, json, preflight, readJson, requireString, TooManyError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { hashToken, mintDeviceToken, requireUser } from '@/lib/session';

/**
 * Redeem a pairing code: move this phone onto a web account.
 *
 * The phone is already signed in anonymously, so this is a *merge*, not a
 * sign-in. Its check-ins, wins and plans move to the target account, the
 * device token is rotated, and the now-empty anonymous account is deleted.
 *
 * ## The merge rule, and why it is this one
 *
 * A check-in is unique per person per day, so the two accounts can disagree
 * about a day they both have. **The target account wins.** The person is
 * pairing a new phone onto the account they already use; silently overwriting
 * a day they recorded there with one from the device being adopted would lose
 * data they can see in favour of data they cannot. Skipped days are counted
 * and reported back so the UI can say what happened instead of pretending the
 * merge was lossless.
 */

/**
 * Rate limiting for code guessing.
 *
 * In-process, so it is per-instance and resets on deploy. That is genuinely
 * not good enough for production — a six-digit code against an unbounded
 * guesser falls in under a day — and it is called out in the README as one of
 * the things to move to the edge or to Redis before launch. It is here because
 * no limit at all would be worse, and because the honest version of "we will
 * add rate limiting later" is a working limit with a comment on it.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 10;

function rateLimit(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    throw new TooManyError('Too many attempts. Wait ten minutes and try again.');
  }
}

export async function POST(request: Request): Promise<Response> {
  return handle(request, async () => {
    const caller = await requireUser(request);
    const body = await readJson(request);
    const code = requireString(body, 'code', { min: 6, max: 6 });

    rateLimit(
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? caller.userId,
    );

    const pairing = await prisma.pairingCode.findUnique({
      where: { code },
      select: { userId: true, expiresAt: true, consumedAt: true },
    });

    // One message for every failure mode. "Expired" versus "wrong" tells a
    // guesser which half of the space to search.
    if (!pairing || pairing.consumedAt || pairing.expiresAt < new Date()) {
      return json(request, { error: 'That code is not valid any more' }, 400);
    }

    const targetUserId = pairing.userId;

    if (targetUserId === caller.userId) {
      return json(request, { error: 'This device is already on that account' }, 400);
    }

    const sourceUserId = caller.userId;

    const result = await prisma.$transaction(async (tx) => {
      await tx.pairingCode.update({
        where: { code },
        data: { consumedAt: new Date() },
      });

      // Check-ins: move the days the target does not already have.
      const [sourceCheckIns, targetDays] = await Promise.all([
        tx.checkIn.findMany({ where: { userId: sourceUserId } }),
        tx.checkIn.findMany({
          where: { userId: targetUserId },
          select: { date: true },
        }),
      ]);

      const taken = new Set(targetDays.map((d) => d.date));
      const movable = sourceCheckIns.filter((c) => !taken.has(c.date));

      if (movable.length > 0) {
        await tx.checkIn.updateMany({
          where: { id: { in: movable.map((c) => c.id) } },
          data: { userId: targetUserId },
        });
      }

      // Everything else has no uniqueness constraint, so it all moves.
      await Promise.all([
        tx.win.updateMany({ where: { userId: sourceUserId }, data: { userId: targetUserId } }),
        tx.unfreezeSession.updateMany({
          where: { userId: sourceUserId },
          data: { userId: targetUserId },
        }),
        tx.resetSession.updateMany({
          where: { userId: sourceUserId },
          data: { userId: targetUserId },
        }),
      ]);

      // Rotate the token as part of the move. The old one was minted for an
      // account that is about to stop existing, and a credential that
      // outlives its account is a credential nobody is tracking.
      const token = mintDeviceToken();
      await tx.device.updateMany({
        where: { userId: sourceUserId },
        data: { userId: targetUserId, tokenHash: hashToken(token) },
      });

      // The source account is now empty. Deleting it is the difference
      // between "paired" and "left a stray anonymous account behind".
      await tx.user.delete({ where: { id: sourceUserId } });

      const target = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { name: true, email: true, anonymous: true },
      });

      return {
        token,
        skippedDays: sourceCheckIns.length - movable.length,
        movedDays: movable.length,
        name: target?.name ?? null,
        email: target?.email ?? null,
        anonymous: target?.anonymous ?? false,
      };
    });

    return json(request, { ok: true, userId: targetUserId, ...result });
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
