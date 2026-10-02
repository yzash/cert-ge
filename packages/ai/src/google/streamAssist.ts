/**
 * Gemini Enterprise grounded Q&A: Discovery Engine `assistants/default_assistant:streamAssist`,
 * called with the officer's own WIF token so data-store ACLs scope answers to their site.
 * The response is a streamed JSON array of StreamAssistResponse objects; we map grounded
 * content to text chunks and grounding references to citation chips.
 */
import type { AskChunk, Citation, Lang } from '@mozart/schema';
import type { GoogleConfig } from './config';
import { detectLang } from '../text';

interface Reference {
  content?: string;
  documentMetadata?: { document?: string; uri?: string; title?: string; pageIdentifier?: string };
}
interface StreamAssistResponse {
  answer?: {
    state?: string;
    replies?: { groundedContent?: { content?: { text?: string; thought?: boolean }; textGroundingMetadata?: { references?: Reference[] } } }[];
  };
  sessionInfo?: { session?: string };
}

/** Incrementally split a streamed top-level JSON array into its objects. */
export function* splitJsonArray(buf: { s: string }): Generator<unknown> {
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < buf.s.length; i++) {
    const ch = buf.s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const obj = JSON.parse(buf.s.slice(start, i + 1));
        buf.s = buf.s.slice(i + 1);
        i = -1;
        start = -1;
        yield obj;
      }
    }
  }
}

/** GE doc ids are mirrored as `ge-doc-<sop id>`; map them back to fixture/Mozart ids. */
export function docIdFromGe(ref: Reference): { docId: string; sectionId: string; title: string } {
  const m = ref.documentMetadata ?? {};
  const raw = (m.document ?? m.uri ?? '').split('/').pop() ?? '';
  const docId = raw.startsWith('ge-doc-') ? raw.slice(7).toUpperCase() : raw || (m.title ?? 'document');
  return { docId, sectionId: m.pageIdentifier ?? 'purpose', title: m.title ?? docId };
}

export async function* streamAssist(cfg: GoogleConfig, token: string, req: { question: string; session?: string; lang?: Lang }): AsyncGenerator<AskChunk> {
  if (!cfg.engineId) throw new Error('GE_ENGINE_ID not configured');
  const t0 = Date.now();
  const url = `https://discoveryengine.googleapis.com/v1alpha/projects/${cfg.project}/locations/${cfg.geLocation}/collections/default_collection/engines/${cfg.engineId}/assistants/default_assistant:streamAssist`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-goog-user-project': cfg.project },
    body: JSON.stringify({
      query: { text: req.question },
      ...(req.session ? { session: req.session } : {}),
      assistSkippingMode: 'REQUEST_ASSIST',
      // Officers get answers only from their site's data stores (ACLs on the engine's data stores).
    }),
  });
  if (!res.ok || !res.body) throw new Error(`streamAssist ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  const buf = { s: '' };
  const cites = new Map<string, Citation>();
  let firstTokenMs = -1;
  let anyText = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf.s += dec.decode(value, { stream: true });
    for (const obj of splitJsonArray(buf)) {
      const r = obj as StreamAssistResponse;
      for (const reply of r.answer?.replies ?? []) {
        const gc = reply.groundedContent;
        for (const ref of gc?.textGroundingMetadata?.references ?? []) {
          const d = docIdFromGe(ref);
          const key = `${d.docId}#${d.sectionId}`;
          if (!cites.has(key)) {
            const c: Citation = { n: cites.size + 1, docId: d.docId, sectionId: d.sectionId, title: d.title, section: ref.content?.slice(0, 60) ?? d.sectionId };
            cites.set(key, c);
            yield { type: 'citation', citation: c };
          }
        }
        const text = gc?.content?.thought ? '' : gc?.content?.text ?? '';
        if (text) {
          if (firstTokenMs < 0) firstTokenMs = Date.now() - t0;
          anyText = true;
          yield { type: 'text', text };
        }
      }
    }
  }
  // Grounded or silent: no references means no answer.
  yield {
    type: 'done', grounded: anyText && cites.size > 0, lang: req.lang ?? detectLang(req.question),
    model: 'gemini-enterprise:streamAssist', latencyMs: Date.now() - t0, firstTokenMs: Math.max(0, firstTokenMs),
  };
}
