import { photoAgent } from '@mozart/ai/src/google';
import type { PhotoCategory } from '@mozart/schema';
import { ctxFor, demo, google, liveOrDemo, readJson } from '@/lib/server';

/** POST /reports/photo: officer's photo → incident draft (GEAP photo agent, Gemini multimodal). */
export async function POST(req: Request) {
  const b = await readJson<{ imageUri: string; category?: PhotoCategory; note?: string; officerId: string; officerZoneId?: string; ctx?: { siteId: string } }>(req);
  const ctx = ctxFor(b.ctx?.siteId);
  return liveOrDemo(req,
    async (token) => {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(b.imageUri);
      if (!m) throw new Error('LIVE photo reports need a real photo (JPEG/PNG/WebP)');
      return photoAgent(google!, token, { mimeType: m[1], data: m[2] }, b, ctx);
    },
    async () => { const { meta: _m, ...r } = await demo.describePhoto({ ...b, ctx }); return r; });
}
