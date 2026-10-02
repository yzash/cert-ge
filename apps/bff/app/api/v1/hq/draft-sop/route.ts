import { sopEditAgent } from '@mozart/ai/src/google';
import { demo, getState, google, liveOrDemo, readJson } from '@/lib/server';

/** POST /hq/draft-sop: draft an SOP step edit from a theme's logs. A human publishes it. */
export async function POST(req: Request) {
  const { themeId, sopId } = await readJson<{ themeId: string; sopId: string }>(req);
  const s = getState();
  const theme = s.themes.find((t) => t.id === themeId);
  const sop = s.sops.find((x) => x.id === sopId);
  if (!theme || !sop) return Response.json({ error: 'not found' }, { status: 404 });
  const logs = s.frictionLogs.filter((f) => theme.logIds.includes(f.id));
  return liveOrDemo(req,
    (token) => sopEditAgent(google!, token, theme, sop, logs),
    async () => { const { meta: _m, ...r } = await demo.draftSopEdit(theme, sop, logs); return r; });
}
