import { NextResponse, type NextRequest } from 'next/server';

/**
 * CORS for the API the mobile app reads.
 *
 * A native build has no origin and is unaffected, but Expo's web target and any
 * separately-hosted client are cross-origin and need this.
 *
 * Origins are allow-listed from `CORPUS_ALLOWED_ORIGINS` (comma-separated).
 * With none configured we fall back to localhost only — a wildcard default
 * would quietly ship an open API to production.
 */
const DEV_ORIGINS = [
  'http://localhost:4000',
  'http://localhost:8081',
  'http://localhost:19006',
];

function allowedOrigins(): string[] {
  const configured = process.env['CORPUS_ALLOWED_ORIGINS'];
  if (configured) return configured.split(',').map((o) => o.trim()).filter(Boolean);
  return process.env.NODE_ENV === 'production' ? [] : DEV_ORIGINS;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = origin && allowedOrigins().includes(origin);

  // Preflight: answer here rather than letting it fall through to a route
  // handler that only exports GET or POST.
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: allowed ? 204 : 403 });
    if (allowed) applyCors(response, origin);
    return response;
  }

  const response = NextResponse.next();
  if (allowed) applyCors(response, origin);
  return response;
}

function applyCors(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Access-Control-Max-Age', '86400');
  // Responses differ by origin, so they must not be cached across origins.
  response.headers.set('Vary', 'Origin');
}

export const config = {
  matcher: '/api/:path*',
};
