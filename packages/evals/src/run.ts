/**
 * Eval harness: grounded Q&A precision, voice-extraction field accuracy, verification verdicts.
 *   pnpm evals                         # DEMO provider, in-process
 *   pnpm evals -- --live http://bff    # LIVE through the BFF (Phase 4 gate: Q&A precision >= 90%)
 * Writes results to packages/evals/results.json.
 */
import { createDemoProvider, createLiveProvider, heuristicExtract, type AiProvider } from '@mozart/ai';
import { seed } from '@mozart/fixtures';
import fs from 'node:fs';
import path from 'node:path';
import { imageSet, qaSet, voiceSet } from './sets';

const args = process.argv.slice(2);
const liveIdx = args.indexOf('--live');
const liveUrl = liveIdx >= 0 ? args[liveIdx + 1] : undefined;
const ai: AiProvider = liveUrl ? createLiveProvider({ bffUrl: liveUrl }) : createDemoProvider({ pace: 0 });
const s = seed();
const ctx = { siteId: 'CNP', sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs };

export async function evalQa() {
  const rows = [];
  for (const c of qaSet) {
    const cited: string[] = [];
    let grounded = false;
    let first = 0;
    try {
      for await (const ch of ai.ask({ question: c.q, officerId: 'o-faizal', siteId: 'CNP', history: [], ctx })) {
        if (ch.type === 'citation') cited.push(ch.citation.docId);
        if (ch.type === 'done') { grounded = ch.grounded; first = ch.firstTokenMs; }
      }
    } catch (e) {
      rows.push({ id: c.id, ok: false, error: String(e) });
      continue;
    }
    // precision: every cited doc is one of the expected sources; groundedness must match
    const precise = c.grounded ? grounded && cited.length > 0 && cited.every((d) => c.expectDocs.includes(d)) : !grounded && cited.length === 0;
    rows.push({ id: c.id, ok: precise, grounded, cited: [...new Set(cited)], firstTokenMs: first });
  }
  return { name: 'Grounded Q&A (cited source correct)', n: rows.length, pass: rows.filter((r) => r.ok).length, target: 0.9, rows };
}

export async function evalVoice() {
  const fields = ['type', 'zoneId', 'assetId', 'severity', 'recommendedSopId'] as const;
  const rows = [];
  for (const clip of voiceSet) {
    const r = await ai.extractReport({ transcript: clip.transcript, clipId: liveUrl ? undefined : clip.id, officerId: 'o-faizal', ctx });
    const correct = fields.filter((f) => r.draft[f] === clip.draft[f]).length;
    // never silently guess: a wrong field must carry confidence < 0.7
    const silentGuess = fields.filter((f) => r.draft[f] !== null && r.draft[f] !== clip.draft[f] && (r.confidence[f] ?? 1) >= 0.7);
    rows.push({ id: clip.id, ok: correct / fields.length >= 0.8 && silentGuess.length === 0, correct, of: fields.length, silentGuess, latencyMs: r.latencyMs });
  }
  return { name: 'Voice-to-report field accuracy', n: rows.length, pass: rows.filter((r) => r.ok).length, target: 0.9, rows };
}

export async function evalVerify() {
  const rows = [];
  for (const img of imageSet) {
    if (liveUrl) { rows.push({ id: img.id, ok: false, skipped: 'SVG demo scenes are DEMO-only; LIVE needs the 20-photo set' }); continue; }
    const r = await ai.verify({ imageUri: `fixture://${img.id}`, assetId: img.assetId, attempt: 1, officerId: 'o-faizal', ctx });
    const lowOk = img.confidence < 0.6 ? r.lowConfidence : !r.lowConfidence;
    rows.push({ id: img.id, ok: r.verdict === img.verdict && lowOk, verdict: r.verdict, expected: img.verdict, lowConfidence: r.lowConfidence });
  }
  return { name: 'Visual verification verdicts', n: rows.length, pass: rows.filter((r) => r.ok).length, target: 0.9, rows };
}

/** Informational: the unscripted DEMO heuristic on the same clips (what a non-scripted sentence gets offline). */
export function evalHeuristic() {
  const fields = ['type', 'zoneId', 'assetId', 'severity', 'recommendedSopId'] as const;
  let correct = 0;
  let total = 0;
  for (const clip of voiceSet.filter((c) => c.lang === 'en')) {
    const r = heuristicExtract({ transcript: clip.transcript, officerId: 'o-faizal', ctx });
    for (const f of fields) { total++; if (r.draft[f] === clip.draft[f]) correct++; }
  }
  return { correct, total };
}

async function main() {
  const results = [await evalQa(), await evalVoice(), await evalVerify()];
  if (!liveUrl) { const h = evalHeuristic(); console.log(`info  Offline heuristic extractor (unscripted, EN clips): ${h.correct}/${h.total} fields correct`); }
  console.log(`\nMozart Frontline evals (${liveUrl ? `LIVE via ${liveUrl}` : 'DEMO'})\n`);
  for (const r of results) {
    const rate = r.pass / r.n;
    console.log(`${rate >= r.target ? 'PASS' : 'FAIL'}  ${r.name}: ${r.pass}/${r.n} (${(rate * 100).toFixed(0)}%, target ${r.target * 100}%)`);
    for (const row of r.rows.filter((x) => !x.ok)) console.log(`      miss ${JSON.stringify(row)}`);
  }
  fs.writeFileSync(path.join(import.meta.dirname, '..', 'results.json'), JSON.stringify({ at: new Date().toISOString(), mode: liveUrl ? 'LIVE' : 'DEMO', results }, null, 2));
  if (results.some((r) => r.pass / r.n < r.target)) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('run.ts')) void main();
