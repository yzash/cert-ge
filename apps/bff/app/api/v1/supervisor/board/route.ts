import { missedCheckpoints, shiftBoard } from '@mozart/actions';
import { getState, officerFrom } from '@/lib/server';

/** GET /supervisor/board: officers, blocked flags, pending closures, friction queue, missed checkpoints. */
export async function GET(req: Request) {
  const supId = officerFrom(req) ?? new URL(req.url).searchParams.get('supervisorId') ?? 'o-meiling';
  const s = getState();
  const sup = s.officers.find((o) => o.id === supId);
  if (!sup || sup.role !== 'supervisor') return Response.json({ error: 'supervisor only' }, { status: 403 });
  return Response.json({
    board: shiftBoard(s, supId),
    closures: s.workOrders.filter((w) => w.siteId === sup.siteId && w.status === 'pending_approval'),
    frictionQueue: s.frictionLogs.filter((f) => f.siteId === sup.siteId && f.routedTo === 'supervisor' && f.status === 'received'),
    missedCheckpoints: missedCheckpoints(s, sup.siteId).map((m) => ({ tourId: m.tour.id, checkpoint: m.cp, officerId: m.officer?.id })),
    handovers: s.handovers.filter((h) => h.siteId === sup.siteId),
  });
}
