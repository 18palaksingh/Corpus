import 'server-only';

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

import { auth } from './auth';
import { prisma } from './prisma';

/**
 * Who is making this request.
 *
 * One API serves two clients with two very different credentials:
 *
 *   - the **web app**, via the Auth.js session cookie;
 *   - the **Android app**, via `Authorization: Bearer <device token>`.
 *
 * Every route resolves the caller through `requireUser` and gets back a user
 * id either way, so no handler has to know which client it is talking to and
 * no handler can accidentally support only one of them.
 */

export interface Caller {
  userId: string;
  via: 'session' | 'device';
}

/** Device tokens are stored hashed; only the hash is ever compared. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A fresh device token. 32 bytes of CSPRNG output, base64url. */
export function mintDeviceToken(): string {
  return randomBytes(32).toString('base64url');
}

/** A six-digit pairing code, zero-padded, from a uniform source. */
export function mintPairingCode(): string {
  return `${randomInt(0, 1_000_000)}`.padStart(6, '0');
}

/**
 * Compare two hex digests without leaking where they diverge.
 *
 * Overkill for a lookup that is already indexed by hash, but the cost is a
 * few microseconds and the habit is worth more than the microseconds.
 */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function bearerFrom(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
}

/**
 * Resolve the caller, or `null` when the request carries no valid credential.
 *
 * A device token that does not match is treated exactly like no token at all.
 * Saying "that token is wrong" tells an attacker their guess was well-formed.
 */
export async function getCaller(request: Request): Promise<Caller | null> {
  const bearer = bearerFrom(request);

  if (bearer) {
    const device = await prisma.device.findUnique({
      where: { tokenHash: hashToken(bearer) },
      select: { id: true, userId: true },
    });

    if (!device) return null;

    // Best-effort liveness, for the "last synced" line and for pruning dead
    // installs later. A failure here must never fail the request.
    void prisma.device
      .update({ where: { id: device.id }, data: { lastSeen: new Date() } })
      .catch(() => undefined);

    return { userId: device.userId, via: 'device' };
  }

  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, via: 'session' };
  }

  return null;
}

/** Thrown by `requireUser`; turned into a 401 by `lib/http.ts`. */
export class UnauthorisedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthorisedError';
  }
}

export async function requireUser(request: Request): Promise<Caller> {
  const caller = await getCaller(request);
  if (!caller) throw new UnauthorisedError();
  return caller;
}
