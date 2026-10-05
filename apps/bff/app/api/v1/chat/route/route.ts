import { routerAgent } from '@mozart/ai/src/google';
import { demo, getState, google, liveOrDemo, readJson } from '@/lib/server';

/** POST /chat/route: chat message → which card to show (GEAP router agent on Flash-Lite). */
export async function POST(req: Request) {
  const b = await readJson<{ text: string; role: 'officer' | 'supervisor' | 'hq'; officerId: string }>(req);
  const s = getState();
  const site = s.officers.find((o) => o.id === b.officerId)?.siteId ?? 'CNP';
  const zones = s.sites.find((x) => x.id === site)?.zones ?? s.sites[0].zones;
  const ctx = { role: b.role, now: Date.now(), zones, robots: s.robots.map((r) => ({ id: r.id, kind: r.kind })) };
  return liveOrDemo(req,
    (token) => routerAgent(google!, token, b.text, ctx),
    async () => { const { meta: _m, ...r } = await demo.routeIntent(b.text, { ...ctx, officerId: b.officerId }); return r; });
}
