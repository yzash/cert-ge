/**
 * LIVE implementation: the app never calls Gemini directly. Every call goes to the BFF
 * (apps/bff), which exchanges the officer token for a WIF token and calls Gemini Enterprise
 * streamAssist / GEAP agents. See docs/adr/0003-live-mode.md.
 */
import { AskChunk, ExtractResult, HandoverDraft, VerifyResult } from '@mozart/schema';
import { z } from 'zod';
import type { AiProvider, AskRequest, ExtractRequest, HandoverRequest, Meta, SopEditDraft, VerifyRequest } from './types';
import type { ClusterResult } from './types';
import { Intent } from './router';

const META: Meta = { mode: 'LIVE' };

export class LiveError extends Error {}

export function createLiveProvider(opts: { bffUrl: string; token?: string; timeoutMs?: number }): AiProvider {
  const base = opts.bffUrl.replace(/\/$/, '') + '/api/v1';
  const timeoutMs = opts.timeoutMs ?? 15000;

  async function post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(base + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}), 'x-mozart-mode': 'LIVE' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new LiveError(`${path} ${res.status}`);
      const json = await res.json();
      if (json?.fallback) throw new LiveError(`${path}: BFF has no LIVE backend (${json.reason ?? 'not configured'})`);
      const parsed = schema.safeParse(json);
      if (!parsed.success) throw new LiveError(`${path}: invalid model output (${parsed.error.issues[0]?.message})`);
      return parsed.data;
    } finally {
      clearTimeout(timer);
    }
  }

  // We send only what the backend needs; site corpora live in GE data stores, not in the request.
  const slimCtx = (ctx: { siteId: string }) => ({ siteId: ctx.siteId });

  return {
    mode: 'LIVE',

    async *ask(req: AskRequest) {
      const res = await fetch(`${base}/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}), 'x-mozart-mode': 'LIVE' },
        body: JSON.stringify({ question: req.question, officerId: req.officerId, siteId: req.siteId, history: req.history.slice(-6) }),
      });
      if (!res.ok) throw new LiveError(`/ask ${res.status}`);
      const parse = (block: string): AskChunk | null => {
        const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
        if (!data) return null;
        const p = AskChunk.safeParse(JSON.parse(data));
        if (!p.success) throw new LiveError('/ask: invalid chunk');
        if (p.data.type === 'done' && p.data.fallback) throw new LiveError('/ask: BFF has no LIVE backend');
        return p.data;
      };
      const reader = (res.body as ReadableStream<Uint8Array> | null)?.getReader?.();
      if (!reader) {
        // React Native fetch has no streaming body; parse the whole SSE payload.
        const all = await res.text();
        for (const block of all.split('\n\n')) { const c = parse(block); if (c) yield c; }
        return;
      }
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const c = parse(block);
          if (c) yield c;
        }
      }
    },

    async *transcribe(clipText: string) {
      // Gemini Live runs over the WebSocket proxy (WS /voice/session). The app records audio
      // and receives partial transcripts; scripted text is passed through when no audio exists.
      yield clipText;
    },

    async extractReport(req: ExtractRequest) {
      const r = await post('/reports/extract', { transcript: req.transcript, officerId: req.officerId, officerZoneId: req.officerZoneId, ctx: slimCtx(req.ctx) }, ExtractResult);
      return { ...r, meta: META };
    },

    async verify(req: VerifyRequest) {
      const r = await post('/verify', { imageUri: req.imageUri, assetId: req.assetId, attempt: req.attempt, officerId: req.officerId, ctx: slimCtx(req.ctx) }, VerifyResult);
      return { ...r, meta: META };
    },

    async generateHandover(req: HandoverRequest) {
      const r = await post('/handover/generate', { officerId: req.officerId, shiftStart: req.shiftStart }, HandoverDraft);
      return { ...r, meta: META };
    },

    async clusterFriction(log) {
      const r = await post('/hq/cluster', { log }, z.object({ themeId: z.string().nullable(), sentiment: z.number(), confidence: z.number(), model: z.string() }));
      return { ...(r as ClusterResult), meta: META };
    },

    async routeIntent(text, ctx) {
      const r = await post('/chat/route', { text, role: ctx.role, officerId: ctx.officerId }, z.object({ intent: Intent, model: z.string() }));
      return { ...r, meta: META };
    },

    async draftSopEdit(theme, sop) {
      const r = await post('/hq/draft-sop', { themeId: theme.id, sopId: sop.id }, z.object({
        sopId: z.string(), n: z.number(), currentText: z.string(), proposedText: z.string(), rationale: z.string(), model: z.string(),
      }));
      return { ...(r as SopEditDraft), meta: META };
    },
  };
}
