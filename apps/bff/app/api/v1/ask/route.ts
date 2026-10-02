import type { AskChunk } from '@mozart/schema';
import { screenResponse, streamAssist } from '@mozart/ai/src/google';
import { ctxFor, demo, google, googleTokenFor, readJson, wantsLive } from '@/lib/server';

/** POST /ask (SSE): grounded Q&A. LIVE = Gemini Enterprise streamAssist with the officer's token. */
export async function POST(req: Request) {
  const body = await readJson<{ question: string; officerId: string; siteId: string; history?: { role: 'user' | 'assistant'; text: string }[] }>(req);
  const token = googleTokenFor(req);
  const live = wantsLive(req);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (c: AskChunk) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(c)}\n\n`));
      try {
        if (live && google?.engineId && token) {
          let text = '';
          for await (const c of streamAssist(google, token, { question: body.question })) {
            if (c.type === 'text') text += c.text;
            if (c.type === 'done') {
              const armor = await screenResponse(google, token, text);
              if (!armor.allowed) { send({ type: 'text', text: '\n\n[Answer withheld by Model Armor]' }); send({ ...c, grounded: false }); continue; }
            }
            send(c);
          }
        } else if (live) {
          send({ type: 'done', grounded: false, lang: 'en', model: 'n/a', latencyMs: 0, firstTokenMs: 0, fallback: true });
        } else {
          for await (const c of demo.ask({ question: body.question, officerId: body.officerId, siteId: body.siteId ?? 'CNP', history: body.history ?? [], ctx: ctxFor(body.siteId) })) send(c);
        }
      } catch {
        send({ type: 'done', grounded: false, lang: 'en', model: 'error', latencyMs: 0, firstTokenMs: 0, fallback: true });
      }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' } });
}
