/**
 * DEMO implementations. Scripted fixtures first, then deterministic heuristics over the
 * site corpus, so the demo works offline and still responds sensibly to unscripted input.
 */
import type { AskChunk, Citation, Doc, ExtractResult, HandoverDraft, HandoverSection, ReportDraft, Severity, SourceRef, VerifyResult } from '@mozart/schema';
import { fixtureImages, qaPairs, voiceClips, type QaPair } from '@mozart/fixtures';
import type { AiProvider, AskRequest, ClusterResult, ExtractRequest, HandoverRequest, Meta, SopEditDraft, VerifyRequest } from './types';
import { detectLang, keyScore, normalize, sleep, tokens } from './text';

const META: Meta = { mode: 'DEMO' };

export const NO_ANSWER: Record<string, string> = {
  en: 'I don’t have that in the site documents.',
  ms: 'Maklumat itu tiada dalam dokumen tapak.',
  zh: '现场文件中没有这方面的信息。',
  ta: 'அந்தத் தகவல் தள ஆவணங்களில் இல்லை.',
};

function cite(docs: Doc[], n: number, docId: string, sectionId: string): Citation | null {
  const d = docs.find((x) => x.id === docId);
  const s = d?.sections.find((x) => x.id === sectionId);
  if (!d || !s) return null;
  return { n, docId, sectionId, title: d.title, section: s.heading };
}

export function matchQa(question: string): { qa: QaPair; score: number } | null {
  const qn = normalize(question);
  let best: { qa: QaPair; score: number } | null = null;
  for (const qa of qaPairs) {
    if (normalize(qa.q) === qn) return { qa, score: 99 };
    const hits = keyScore(question, qa.keys);
    const score = hits / Math.max(3, qa.keys.length) + hits * 0.15;
    if (hits >= 2 && (!best || score > best.score)) best = { qa, score };
  }
  return best;
}

/** Tiny lexical retriever over doc sections, used when no scripted pair matches. */
export function retrieve(question: string, docs: Doc[], siteId: string, limit = 2) {
  const q = tokens(question).filter((w) => w.length > 2);
  if (!q.length) return [];
  const scored: { doc: Doc; sectionId: string; heading: string; body: string; score: number }[] = [];
  for (const d of docs) {
    if (!d.siteIds.includes(siteId)) continue;
    for (const s of d.sections) {
      const body = normalize(`${d.title} ${s.heading} ${s.body}`);
      let score = 0;
      for (const w of q) if (body.includes(w)) score += w.length > 5 ? 1.5 : 1;
      if (score > 0) scored.push({ doc: d, sectionId: s.id, heading: s.heading, body: s.body, score: score / Math.sqrt(q.length) });
    }
  }
  return scored.sort((a, b) => b.score - a.score).filter((s) => s.score >= 1.6).slice(0, limit);
}

function chunkText(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [text];
}

export function createDemoProvider(opts: { pace?: number } = {}): AiProvider {
  const pace = opts.pace ?? 1;
  const wait = (ms: number) => (pace > 0 ? sleep(ms * pace) : Promise.resolve());

  return {
    mode: 'DEMO',

    async *ask(req: AskRequest): AsyncGenerator<AskChunk> {
      const t0 = Date.now();
      const lang = detectLang(req.question);
      const docs = req.ctx.docs;
      let text = '';
      let cites: Citation[] = [];
      let grounded = true;

      const m = matchQa(req.question);
      const last = [...req.history].reverse().find((h) => h.role === 'assistant');
      const stepMatch = /\bstep\s*(\d+)\b/i.exec(req.question);

      if (m) {
        text = m.qa.a;
        cites = m.qa.cites.map((c, i) => cite(docs, i + 1, c.docId, c.sectionId)).filter((c): c is Citation => !!c);
        // keep SOP changes live: if an SOP step was updated by HQ, cite + quote the current text
        for (const c of cites) {
          const sop = req.ctx.sops.find((s) => s.id === c.docId);
          if (sop && sop.history.length > 1 && c.sectionId.startsWith('s')) {
            const n = Number(c.sectionId.slice(1));
            const step = sop.steps.find((s) => s.n === n);
            const changed = sop.history[sop.history.length - 1];
            if (step && changed.note.includes(`step ${n}`)) {
              text += `\n\nUpdated in ${sop.code} v${sop.version}: “${step.text}” [${c.n}]`;
            }
          }
        }
      } else if (stepMatch && last?.docIds?.length) {
        // follow-up: "and step 3?" against the SOP from the previous answer
        const sopId = last.docIds.find((d) => d.startsWith('SOP-'));
        const doc = docs.find((d) => d.id === sopId);
        const sec = doc?.sections.find((s) => s.id === `s${stepMatch[1]}`);
        if (doc && sec) {
          text = `${doc.title}, step ${stepMatch[1]}: ${sec.body} [1]`;
          cites = [cite(docs, 1, doc.id, sec.id)!];
        } else grounded = false;
      } else {
        const hits = retrieve(req.question, docs, req.siteId);
        if (hits.length) {
          text = hits.map((h, i) => `${h.doc.title} — ${h.heading}: ${h.body} [${i + 1}]`).join('\n\n');
          cites = hits.map((h, i) => cite(docs, i + 1, h.doc.id, h.sectionId)!);
        } else grounded = false;
      }

      await wait(650); // first token
      const firstTokenMs = Date.now() - t0;
      if (!grounded) {
        for (const c of chunkText(NO_ANSWER[lang] ?? NO_ANSWER.en)) {
          yield { type: 'text', text: c };
          await wait(18);
        }
        yield { type: 'done', grounded: false, lang, model: 'demo-scripted', latencyMs: Date.now() - t0, firstTokenMs };
        return;
      }
      for (const c of cites) yield { type: 'citation', citation: c };
      for (const c of chunkText(text)) {
        yield { type: 'text', text: c };
        await wait(c.length > 6 ? 30 : 18);
      }
      yield { type: 'done', grounded: true, lang: m?.qa.lang ?? lang, model: m ? 'demo-scripted' : 'demo-retrieval', latencyMs: Date.now() - t0, firstTokenMs };
    },

    async *transcribe(clipText: string, o?: { durationSec?: number }) {
      const words = clipText.split(/(?<=\s)|(?=[一-鿿])/).filter(Boolean);
      const totalMs = Math.min(6000, Math.max(1500, (o?.durationSec ?? words.length / 2.6) * 280));
      const per = totalMs / Math.max(1, words.length);
      let acc = '';
      for (const w of words) {
        acc += w;
        yield acc;
        await wait(per);
      }
    },

    async extractReport(req: ExtractRequest) {
      const t0 = Date.now();
      await wait(1400);
      const clip = voiceClips.find((c) => c.id === req.clipId && normalize(c.transcript) === normalize(req.transcript))
        ?? voiceClips.find((c) => normalize(c.transcript) === normalize(req.transcript));
      let res: ExtractResult;
      if (clip) {
        const confidence: Record<string, number> = {};
        for (const [k, v] of Object.entries(clip.confidence)) confidence[k] = v ?? 0;
        res = { draft: { ...clip.draft }, confidence, model: 'demo-scripted-extractor', latencyMs: 0 };
      } else {
        res = heuristicExtract(req);
      }
      res.latencyMs = Date.now() - t0;
      return { ...res, meta: META };
    },

    async verify(req: VerifyRequest) {
      const t0 = Date.now();
      await wait(1600);
      const id = req.imageUri.startsWith('fixture://') ? req.imageUri.slice('fixture://'.length) : null;
      const img = id ? fixtureImages.find((i) => i.id === id) : undefined;
      const sopText = (sopId: string, n: number) => req.ctx.sops.find((s) => s.id === sopId)?.steps.find((s) => s.n === n)?.text ?? '';
      let r: VerifyResult;
      if (img) {
        r = {
          assetId: img.assetId,
          identifiedBy: img.qr ? 'qr' : req.assetId ? 'qr' : 'visual',
          verdict: img.verdict,
          reason: img.reason,
          observed: img.observed,
          nextStep: img.nextStep ? { ...img.nextStep, text: sopText(img.nextStep.sopId, img.nextStep.n) } : null,
          confidence: img.confidence,
          lowConfidence: img.confidence < 0.6,
          model: 'demo-scripted-verifier',
          latencyMs: 0,
        };
      } else {
        // A real photo in DEMO mode: we cannot actually see it, so we say so honestly.
        const asset = req.ctx.assets.find((a) => a.id === req.assetId);
        r = {
          assetId: asset?.id ?? null,
          identifiedBy: asset ? 'qr' : 'none',
          verdict: 'attention',
          reason: asset
            ? `DEMO mode cannot analyse live photos. Compare the ${asset.name} against the expected states below, or switch to LIVE for Gemini multimodal verification.`
            : 'DEMO mode cannot analyse live photos and the asset was not identified. Scan the asset QR or pick a demo scene.',
          observed: (asset?.expectedStates ?? []).map((e) => ({ indicator: e.indicator, expected: e.expected, observed: 'Not assessed (DEMO)', ok: false })),
          nextStep: null,
          confidence: 0.3,
          lowConfidence: true,
          model: 'demo-scripted-verifier',
          latencyMs: 0,
        };
      }
      r.latencyMs = Date.now() - t0;
      return { ...r, meta: META };
    },

    async generateHandover(req: HandoverRequest) {
      const t0 = Date.now();
      await wait(2200);
      const d = summariseShift(req);
      return { ...d, latencyMs: Date.now() - t0, meta: META };
    },

    async clusterFriction(log, themes) {
      await wait(300);
      return { ...clusterHeuristic(log, themes), meta: META };
    },

    async draftSopEdit(theme, sop, logs) {
      await wait(1200);
      return { ...draftEditHeuristic(theme, sop, logs), meta: META };
    },
  };
}

// ---------------------------------------------------------------- heuristics

const TYPE_WORDS: [ReportDraft['type'], string[]][] = [
  ['incident', ['collapsed', 'injured', 'injury', 'fight', 'theft', 'stolen', 'trapped', 'unattended', 'suspicious', 'assault', 'trespass', 'child', 'bleeding', 'ambulance']],
  ['hazard', ['leak', 'spill', 'slippery', 'wet', 'dripping', 'exposed', 'sparking', 'smoke', 'tumpahan', 'hazard', 'trip']],
  ['corrective_wo', ['jammed', 'stuck', 'broken', 'faulty', 'not working', 'not lit', 'flickering', 'fault', 'damaged', 'wont', 'will not', 'out of order', 'rosak']],
];

const SEV_WORDS: [Severity, string[]][] = [
  ['critical', ['fire', 'smoke', 'not breathing', 'unconscious', 'bleeding heavily', 'weapon']],
  ['high', ['injured', 'collapsed', 'trapped', 'electrical', 'sparking', 'flooding', 'a lot', 'queuing']],
  ['low', ['minor', 'small', 'cosmetic', 'not lit', 'flickering']],
];

export function heuristicExtract(req: ExtractRequest): ExtractResult {
  const text = ` ${normalize(req.transcript)} `;
  const conf: Record<string, number> = {};
  const draft: ReportDraft = { type: null, title: null, zoneId: null, location: null, assetId: null, severity: null, description: null, recommendedSopId: null };

  for (const [type, words] of TYPE_WORDS) {
    if (words.some((w) => text.includes(` ${w}`))) { draft.type = type; conf.type = 0.72; break; }
  }
  if (!draft.type) { draft.type = 'observation'; conf.type = 0.55; }

  // asset: best keyword overlap
  let bestAsset: { id: string; score: number } | null = null;
  for (const a of req.ctx.assets.filter((x) => x.siteId === req.ctx.siteId)) {
    const score = keyScore(req.transcript, [...a.keywords, a.name, a.tag.toLowerCase()]);
    if (score > 0 && (!bestAsset || score > bestAsset.score)) bestAsset = { id: a.id, score };
  }
  const site = req.ctx.sites.find((s) => s.id === req.ctx.siteId);
  const asset = bestAsset && bestAsset.score >= 2 ? req.ctx.assets.find((a) => a.id === bestAsset!.id) : undefined;
  if (asset) { draft.assetId = asset.id; conf.assetId = Math.min(0.85, 0.55 + bestAsset!.score * 0.1); }

  // zone: spoken level/zone names
  const zone = site?.zones.find((z) => {
    const parts = normalize(z.name).split(' ');
    return parts.slice(1).some((p) => p.length > 3 && text.includes(` ${p}`)) || text.includes(` ${normalize(z.level)} `) || text.includes(` level ${normalize(z.level).replace(/\D/g, '')} `);
  });
  const z = asset ? site?.zones.find((x) => x.id === asset.zoneId) : zone;
  if (z) { draft.zoneId = z.id; draft.location = z.name; conf.zoneId = asset ? 0.8 : 0.66; conf.location = conf.zoneId; }
  else if (req.officerZoneId) {
    const oz = site?.zones.find((x) => x.id === req.officerZoneId);
    if (oz) { draft.zoneId = oz.id; draft.location = `${oz.name} (from GPS)`; conf.zoneId = 0.6; conf.location = 0.6; }
  }

  for (const [sev, words] of SEV_WORDS) {
    if (words.some((w) => text.includes(` ${w}`))) { draft.severity = sev; conf.severity = 0.62; break; }
  }
  if (!draft.severity && draft.type !== 'observation') { draft.severity = 'medium'; conf.severity = 0.5; }

  draft.description = req.transcript.trim();
  conf.description = 0.9;
  const words = req.transcript.trim().split(/\s+/).slice(0, 8).join(' ');
  draft.title = (asset ? `${asset.name}: ` : '') + words.replace(/[.,]$/, '');
  conf.title = 0.6;

  if (asset?.sopId) { draft.recommendedSopId = asset.sopId; conf.recommendedSopId = 0.7; }
  else {
    const sop = req.ctx.sops
      .map((s) => ({ s, k: keyScore(req.transcript, tokens(s.title).filter((w) => w.length > 3)) }))
      .sort((a, b) => b.k - a.k)[0];
    if (sop && sop.k >= 1) { draft.recommendedSopId = sop.s.id; conf.recommendedSopId = 0.55; }
  }
  for (const k of Object.keys(draft) as (keyof ReportDraft)[]) if (draft[k] === null) conf[k] = 0;
  return { draft, confidence: conf, model: 'demo-heuristic-extractor', latencyMs: 0 };
}

export function clusterHeuristic(
  log: { text: string; category: string; sopStepRef?: { sopId: string; n: number }; assetId?: string },
  themes: { id: string; keywords: string[]; category: string; sopId?: string; sopStep?: number; decision?: string }[],
): ClusterResult {
  let best: { id: string; s: number } | null = null;
  for (const t of themes) {
    if (t.decision) continue;
    let s = keyScore(log.text, t.keywords);
    if (t.category === log.category) s += 0.5;
    if (log.sopStepRef && t.sopId === log.sopStepRef.sopId) s += t.sopStep === log.sopStepRef.n ? 2 : 1;
    if (!best || s > best.s) best = { id: t.id, s };
  }
  const neg = ['not', 'no', 'cannot', 'dies', 'dead', 'broken', 'slow', 'waited', 'again', 'stuck', 'flat', 'never', 'don’t', 'dont', 'assumes'];
  const n = ` ${normalize(log.text)} `;
  const negHits = neg.filter((w) => n.includes(` ${w} `)).length;
  const sentiment = Math.max(-1, -0.2 - negHits * 0.15);
  return best && best.s >= 2
    ? { themeId: best.id, sentiment, confidence: Math.min(0.95, 0.5 + best.s * 0.1), model: 'demo-keyword-cluster' }
    : { themeId: null, sentiment, confidence: 0.4, model: 'demo-keyword-cluster' };
}

export function draftEditHeuristic(
  theme: { id: string; sopStep?: number; label: string },
  sop: { id: string; steps: { n: number; text: string }[] },
  logs: { siteId: string }[],
): SopEditDraft {
  const n = theme.sopStep ?? 1;
  const current = sop.steps.find((s) => s.n === n)?.text ?? '';
  const sites = new Set(logs.map((l) => l.siteId)).size;
  if (theme.id === 'th-gate-key') {
    return {
      sopId: sop.id, n, currentText: current,
      proposedText: 'If the gate does not respond, stay at the gate and request the override key from the FCC duty officer on radio channel 3. FCC dispatches a key runner (target 5 minutes). Where a dock key safe is fitted, FCC gives you the code and you take the key from the safe. Never force the gate.',
      rationale: `${logs.length} officers across ${sites} sites reported that step ${n} assumes an override key that patrol officers do not carry (SOP-ACC-005 step 3). Officers left the gate unattended for 8–15 minutes to fetch it while vehicles queued. The edit keeps key control with FCC and keeps the officer at the gate.`,
      model: 'demo-scripted-sop-editor',
    };
  }
  return {
    sopId: sop.id, n, currentText: current,
    proposedText: `${current} If this cannot be done in the field, inform FCC on channel 1 and record why in the work order.`,
    rationale: `${logs.length} friction logs across ${sites} sites: "${theme.label}".`,
    model: 'demo-heuristic-sop-editor',
  };
}

function ref(kind: SourceRef['kind'], id: string, label?: string): SourceRef {
  return { kind, id, label: label ?? id };
}

export function summariseShift(req: HandoverRequest): Omit<HandoverDraft, 'latencyMs'> {
  const me = req.officerId;
  const since = new Date(req.shiftStart).getTime();
  const assetName = (id?: string | null) => req.ctx.assets.find((a) => a.id === id)?.name;
  const mine = req.workOrders.filter((w) => w.assigneeId === me);
  const open = mine.filter((w) => !['closed', 'pending_approval'].includes(w.status));
  const done = mine.filter((w) => (w.status === 'closed' && w.closedAt && new Date(w.closedAt).getTime() >= since) || w.status === 'pending_approval');
  const sections: HandoverSection[] = [];
  let i = 0;
  const id = () => `h${++i}`;

  const prio = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  open.sort((a, b) => prio[a.priority] - prio[b.priority] || a.slaDue.localeCompare(b.slaDue));
  sections.push({
    id: 'open', title: 'Open items for the next shift',
    items: open.length ? open.map((w) => {
      const remaining = w.steps.filter((s) => !s.done).map((s) => s.label.toLowerCase());
      const statusText = w.status === 'on_hold' ? 'on hold' : w.status === 'assignment' ? 'not started' : w.status.replace('_', ' ');
      return {
        id: id(),
        text: `${w.title} (${w.priority}, ${statusText}). Next: ${remaining[0] ?? 'close the job'}.`,
        sourceRefs: [ref('workOrder', w.id)],
      };
    }) : [{ id: id(), text: 'No open work orders.', sourceRefs: [] }],
  });

  const alarms = req.alarms.filter((a) => a.assigneeId === me && a.status !== 'resolved');
  if (alarms.length) sections.push({
    id: 'alarms', title: 'Alarms still active',
    items: alarms.map((a) => ({ id: id(), text: `${a.title} (${a.status}).`, sourceRefs: [ref('alarm', a.id), ...(a.workOrderId ? [ref('workOrder', a.workOrderId)] : [])] })),
  });

  const reports = [
    ...req.workOrders.filter((w) => w.source === 'voice' && w.confirmedBy === me).map((w) => ({ text: `Reported by voice: ${w.title} → ${w.id}, ${w.priority}.`, refs: [ref('workOrder', w.id), ...(w.sourceRecordId ? [ref('voiceReport', w.sourceRecordId, 'voice report')] : [])] })),
    ...req.incidents.filter((x) => x.reporterId === me && new Date(x.createdAt).getTime() >= since).map((x) => ({ text: `Incident ${x.id}: ${x.type} at ${x.location} (${x.severity}).`, refs: [ref('incident', x.id)] })),
  ];
  if (reports.length) sections.push({ id: 'reports', title: 'Reports filed this shift', items: reports.map((r) => ({ id: id(), text: r.text, sourceRefs: r.refs })) });

  const ver = req.verifications.filter((v) => v.officerId === me && new Date(v.createdAt).getTime() >= since);
  if (ver.length) sections.push({
    id: 'verify', title: 'Equipment checks',
    items: ver.map((v) => ({
      id: id(),
      text: `${assetName(v.assetId) ?? 'Asset'}: ${(v.override ?? v.verdict).toUpperCase()}${v.override ? ' (officer override)' : ''}. ${v.reason.split('. ')[0]}.`,
      sourceRefs: [ref('verification', v.id), ...(v.workOrderId ? [ref('workOrder', v.workOrderId)] : [])],
    })),
  });

  if (done.length) sections.push({
    id: 'done', title: 'Completed this shift',
    items: done.map((w) => ({ id: id(), text: `${w.title}${w.status === 'pending_approval' ? ' (awaiting supervisor approval)' : ''}.`, sourceRefs: [ref('workOrder', w.id)] })),
  });

  const tour = req.tours.find((t) => t.officerId === me);
  if (tour) {
    const now = Date.now();
    const missed = tour.checkpoints.filter((c) => !c.scannedAt && new Date(c.dueAt).getTime() + tour.graceMinutes * 60000 < now);
    const scanned = tour.checkpoints.filter((c) => c.scannedAt);
    const left = tour.checkpoints.filter((c) => !c.scannedAt && !missed.includes(c));
    sections.push({
      id: 'tour', title: 'Guard tour',
      items: [
        { id: id(), text: `${tour.name}: ${scanned.length}/${tour.checkpoints.length} checkpoints scanned${left.length ? `, ${left.length} still to do` : ''}.`, sourceRefs: [] },
        ...missed.map((c) => ({ id: id(), text: `Missed: ${c.name}. Record the reason.`, sourceRefs: [ref('checkpoint', c.id, c.name)] })),
        ...scanned.filter((c) => c.voiceReportId).map((c) => ({ id: id(), text: `Note at ${c.name}: ${c.note ?? ''}`, sourceRefs: [ref('checkpoint', c.id, c.name)] })),
      ],
    });
  }

  const fr = req.frictionLogs.filter((f) => f.officerId === me && new Date(f.createdAt).getTime() >= since);
  if (fr.length) sections.push({
    id: 'friction', title: 'Friction raised',
    items: fr.map((f) => ({ id: id(), text: `${f.category.toUpperCase()}: ${f.text}`, sourceRefs: [ref('friction', f.id)] })),
  });

  const top = open[0];
  const headline = `${open.length} open item${open.length === 1 ? '' : 's'}, ${done.length} completed${reports.length ? `, ${reports.length} report${reports.length === 1 ? '' : 's'} filed` : ''}.${top ? ` Priority: ${top.title}.` : ''}`;
  return { headline, sections, model: 'demo-handover-summariser' };
}
