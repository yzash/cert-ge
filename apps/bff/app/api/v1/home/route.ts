import { rankTasks, unackedBriefing } from '@mozart/actions';
import { getState } from '@/lib/server';

/** GET /home?officerId=: ranked tasks, briefing and open alarms (Shift Home). */
export async function GET(req: Request) {
  const officerId = new URL(req.url).searchParams.get('officerId') ?? 'o-faizal';
  const s = getState();
  const me = s.officers.find((o) => o.id === officerId);
  if (!me) return Response.json({ error: 'unknown officer' }, { status: 404 });
  return Response.json({
    officer: me,
    tasks: rankTasks(s, officerId).slice(0, 3),
    briefing: s.briefingItems.filter((b) => b.siteId === me.siteId),
    toAcknowledge: unackedBriefing(s, me).map((b) => b.id),
    alarms: s.alarms.filter((a) => a.assigneeId === officerId && a.status !== 'resolved'),
  });
}
