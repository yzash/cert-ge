import { handoverAgent } from '@mozart/ai/src/google';
import { ctxFor, demo, getState, google, liveOrDemo, readJson } from '@/lib/server';

/** POST /handover/generate: the shift's structured records → handover draft with source links. */
export async function POST(req: Request) {
  const b = await readJson<{ officerId: string; shiftStart: string }>(req);
  const s = getState();
  const officer = s.officers.find((o) => o.id === b.officerId);
  if (!officer) return Response.json({ error: 'unknown officer' }, { status: 404 });
  const input = {
    officerId: b.officerId, officer, shiftStart: b.shiftStart, workOrders: s.workOrders, incidents: s.incidents, alarms: s.alarms,
    voiceReports: s.voiceReports, verifications: s.verifications, frictionLogs: s.frictionLogs, tours: s.tours,
  };
  return liveOrDemo(req,
    (token) => handoverAgent(google!, token, input),
    async () => { const { meta: _m, ...r } = await demo.generateHandover({ ...input, ctx: ctxFor(officer.siteId) }); return r; });
}
