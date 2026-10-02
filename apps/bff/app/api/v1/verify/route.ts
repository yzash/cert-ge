import { verifyAgent } from '@mozart/ai/src/google';
import { ctxFor, demo, google, liveOrDemo, readJson } from '@/lib/server';

/** POST /verify: image + asset → Pass / Attention / Fail (GEAP verifier, Gemini multimodal). */
export async function POST(req: Request) {
  const b = await readJson<{ imageUri: string; assetId?: string; attempt: number; officerId: string; ctx?: { siteId: string } }>(req);
  const ctx = ctxFor(b.ctx?.siteId);
  return liveOrDemo(req,
    async (token) => {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(b.imageUri);
      if (!m) throw new Error('LIVE verification needs a real photo (JPEG/PNG/WebP); demo scenes are DEMO-only');
      return verifyAgent(google!, token, { mimeType: m[1], data: m[2] }, b.assetId, ctx);
    },
    async () => { const { meta: _m, ...r } = await demo.verify({ ...b, ctx }); return r; });
}
