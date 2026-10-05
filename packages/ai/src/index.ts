/**
 * Single AI interface for the app. The app calls `createAi(...)` and never branches on mode:
 * LIVE calls go through the BFF and fall back to DEMO (with a visible badge) on any failure.
 * Every call is audited (prompt hash, model, latency, tokens) via `onAudit`.
 */
import type { AskChunk } from '@mozart/schema';
import { createDemoProvider } from './demo';
import { createLiveProvider } from './live';
import { estimateTokens, hash } from './text';
import type { AiOptions, AiProvider, Meta } from './types';

export * from './types';
export * from './text';
export * from './router';
export { createDemoProvider, heuristicExtract, clusterHeuristic, summariseShift, matchQa, retrieve, NO_ANSWER, draftEditHeuristic } from './demo';
export { createLiveProvider, LiveError } from './live';

export function createAi(opts: AiOptions): AiProvider {
  const demo = createDemoProvider({ pace: opts.pace });
  if (opts.mode === 'DEMO' || !opts.bffUrl) return audited(demo, opts, 'DEMO');
  const live = createLiveProvider({ bffUrl: opts.bffUrl, token: opts.token });
  return audited(withFallback(live, demo, opts), opts, 'LIVE');
}

type AnyFn = (...a: any[]) => any;

function withFallback(live: AiProvider, demo: AiProvider, opts: AiOptions): AiProvider {
  const fb = (reason: string): Meta => ({ mode: 'DEMO', fallback: true, fallbackReason: reason });
  const wrap = <K extends 'extractReport' | 'verify' | 'generateHandover' | 'clusterFriction' | 'draftSopEdit' | 'routeIntent'>(k: K) =>
    (async (...args: any[]) => {
      try {
        return await (live[k] as AnyFn)(...args);
      } catch (e) {
        opts.onAudit?.({ feature: k, mode: 'LIVE', model: 'n/a', latencyMs: 0, promptHash: '-', tokens: 0, ok: false, detail: String((e as Error).message), officerId: args[0]?.officerId ?? '-' });
        const r = await (demo[k] as AnyFn)(...args);
        return { ...r, meta: fb(String((e as Error).message)) };
      }
    }) as AiProvider[K];

  return {
    mode: 'LIVE',
    async *ask(req) {
      let yielded = false;
      try {
        for await (const c of live.ask(req)) { yielded = true; yield c; }
      } catch (e) {
        if (yielded) throw e;
        opts.onAudit?.({ feature: 'ask', mode: 'LIVE', model: 'n/a', latencyMs: 0, promptHash: '-', tokens: 0, ok: false, detail: String((e as Error).message), officerId: req.officerId });
        for await (const c of demo.ask(req)) yield c.type === 'done' ? { ...c, fallback: true } : c;
      }
    },
    transcribe: (t, o) => demo.transcribe(t, o),
    extractReport: wrap('extractReport'),
    verify: wrap('verify'),
    generateHandover: wrap('generateHandover'),
    clusterFriction: wrap('clusterFriction'),
    draftSopEdit: wrap('draftSopEdit'),
    routeIntent: wrap('routeIntent'),
  };
}

function audited(p: AiProvider, opts: AiOptions, mode: 'DEMO' | 'LIVE'): AiProvider {
  if (!opts.onAudit) return p;
  const sink = opts.onAudit;
  const time = <K extends 'extractReport' | 'verify' | 'generateHandover' | 'clusterFriction' | 'draftSopEdit' | 'routeIntent'>(k: K, prompt: (...a: any[]) => string) =>
    (async (...args: any[]) => {
      const t0 = Date.now();
      const r = await (p[k] as AnyFn)(...args);
      const pr = prompt(...args);
      sink({
        feature: k, mode: r.meta?.fallback ? 'DEMO' : mode, model: r.model ?? 'unknown', latencyMs: Date.now() - t0,
        promptHash: hash(pr), tokens: estimateTokens(pr) + estimateTokens(JSON.stringify(r)), ok: true,
        detail: r.meta?.fallback ? `fallback: ${r.meta.fallbackReason}` : undefined, officerId: args[0]?.officerId ?? '-',
      });
      return r;
    }) as AiProvider[K];
  return {
    mode: p.mode,
    async *ask(req) {
      const t0 = Date.now();
      let out = '';
      let done: Extract<AskChunk, { type: 'done' }> | undefined;
      for await (const c of p.ask(req)) {
        if (c.type === 'text') out += c.text;
        if (c.type === 'done') done = c;
        yield c;
      }
      sink({
        feature: 'ask', mode: done?.fallback ? 'DEMO' : mode, model: done?.model ?? 'unknown', latencyMs: Date.now() - t0,
        promptHash: hash(req.question), tokens: estimateTokens(req.question) + estimateTokens(out), ok: true, officerId: req.officerId,
        detail: done ? `grounded=${done.grounded}; first token ${done.firstTokenMs} ms` : undefined,
      });
    },
    transcribe: (t, o) => p.transcribe(t, o),
    extractReport: time('extractReport', (r) => r.transcript),
    verify: time('verify', (r) => `${r.imageUri.slice(0, 64)}|${r.assetId ?? ''}`),
    generateHandover: time('generateHandover', (r) => `${r.officerId}|${r.shiftStart}`),
    clusterFriction: time('clusterFriction', (l) => l.text),
    draftSopEdit: time('draftSopEdit', (t) => t.id),
    routeIntent: time('routeIntent', (t) => t),
  };
}
