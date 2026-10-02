import { extractAgent } from '@mozart/ai/src/google';
import { ctxFor, demo, google, liveOrDemo, readJson } from '@/lib/server';

/** POST /reports/extract: transcript → structured draft (GEAP extractor on Gemini Flash). */
export async function POST(req: Request) {
  const b = await readJson<{ transcript: string; officerId: string; officerZoneId?: string; clipId?: string; ctx?: { siteId: string } }>(req);
  const ctx = ctxFor(b.ctx?.siteId);
  return liveOrDemo(req,
    (token) => extractAgent(google!, token, b.transcript, ctx, b.officerZoneId),
    async () => { const { meta: _m, ...r } = await demo.extractReport({ transcript: b.transcript, clipId: b.clipId, officerId: b.officerId, officerZoneId: b.officerZoneId, ctx }); return r; });
}
