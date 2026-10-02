import { NextResponse, type NextRequest } from 'next/server';

/** CORS for the Expo web build and simple per-IP rate limiting (Cloud Armor does this in production). */
const hits = new Map<string, { n: number; t: number }>();

export function middleware(req: NextRequest) {
  const origin = process.env.CORS_ORIGIN ?? '*';
  const headers = {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-mozart-mode,idempotency-key',
  };
  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  const now = Date.now();
  const h = hits.get(ip) ?? { n: 0, t: now };
  if (now - h.t > 60_000) { h.n = 0; h.t = now; }
  h.n++;
  hits.set(ip, h);
  if (h.n > 600) return NextResponse.json({ error: 'rate limited' }, { status: 429, headers });
  const res = NextResponse.next();
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = { matcher: '/api/:path*' };
