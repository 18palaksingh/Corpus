import 'server-only';

import { UnauthorisedError } from './session';

/**
 * Shared request plumbing: CORS, JSON replies, validation and error shaping.
 *
 * Every route goes through `handle` so that a thrown validation error becomes
 * a 400 and an unauthenticated caller becomes a 401 in exactly one place. The
 * alternative — try/catch in twelve route files — is where a route eventually
 * returns a stack trace to a client.
 */

/**
 * Origins allowed to call the API cross-origin.
 *
 * The Android app in development talks to this server from `localhost:8081`,
 * and a release build talks to it from no origin at all (native fetch sends
 * none), which is why a missing `Origin` is allowed through: it cannot be a
 * browser, so it cannot be a cross-site request forgery.
 */
function allowedOrigins(): string[] {
  return (process.env.STEADY_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin || !allowedOrigins().includes(origin)) return {};

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    vary: 'Origin',
  };
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Nothing here is cacheable: every response is one person's own data.
      'cache-control': 'no-store',
      ...corsHeaders(request),
    },
  });
}

/** Thrown by the validators below; becomes a 400. */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

/** Thrown when a caller asks for something too often; becomes a 429. */
export class TooManyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TooManyError';
  }
}

/**
 * Run a route handler with uniform error shaping.
 *
 * Unexpected errors are logged server-side and answered with a flat 500. The
 * message never reaches the client — a stack trace in a fetch response is how
 * a schema ends up on the internet.
 */
export async function handle(
  request: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof UnauthorisedError) {
      return json(request, { error: 'Not signed in' }, 401);
    }
    if (error instanceof BadRequestError) {
      return json(request, { error: error.message }, 400);
    }
    if (error instanceof TooManyError) {
      return json(request, { error: error.message }, 429);
    }

    console.error('[steady] unhandled route error', error);
    return json(request, { error: 'Something went wrong' }, 500);
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new BadRequestError('Expected a JSON body');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestError('Expected a JSON object');
  }

  return parsed as Record<string, unknown>;
}

/** An integer within `[min, max]`. Rejects `"3"`, floats and NaN alike. */
export function requireInt(
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number {
  const value = body[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new BadRequestError(`${key} must be a whole number between ${min} and ${max}`);
  }
  return value;
}

/** A finite number within `[min, max]`. Accepts fractions — sleep is 7.5h. */
export function requireNumber(
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number {
  const value = body[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new BadRequestError(`${key} must be a number between ${min} and ${max}`);
  }
  return value;
}

export function requireBoolean(body: Record<string, unknown>, key: string): boolean {
  const value = body[key];
  if (typeof value !== 'boolean') {
    throw new BadRequestError(`${key} must be true or false`);
  }
  return value;
}

export function requireString(
  body: Record<string, unknown>,
  key: string,
  { min = 1, max = 2000 }: { min?: number; max?: number } = {},
): string {
  const value = body[key];
  if (typeof value !== 'string') {
    throw new BadRequestError(`${key} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new BadRequestError(`${key} must be between ${min} and ${max} characters`);
  }
  return trimmed;
}

export function optionalString(
  body: Record<string, unknown>,
  key: string,
  max = 2000,
): string | null {
  if (body[key] === undefined || body[key] === null) return null;
  return requireString(body, key, { max });
}
