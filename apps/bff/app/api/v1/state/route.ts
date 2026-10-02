import { getState } from '@/lib/server';

/** GET /state?since=seq: full snapshot for devices (204 when nothing changed). */
export async function GET(req: Request) {
  const since = Number(new URL(req.url).searchParams.get('since') ?? -1);
  const s = getState();
  if (since >= 0 && s.seq <= since) return new Response(null, { status: 204 });
  return Response.json(s);
}
