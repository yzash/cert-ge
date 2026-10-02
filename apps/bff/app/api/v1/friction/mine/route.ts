import { getState, officerFrom } from '@/lib/server';

/** GET /friction/mine: the caller's friction logs with status and decision text. */
export async function GET(req: Request) {
  const officerId = officerFrom(req) ?? new URL(req.url).searchParams.get('officerId');
  return Response.json(getState().frictionLogs.filter((f) => f.officerId === officerId));
}
