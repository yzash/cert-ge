/**
 * GEAP agents (LIVE). Each one: Model Armor on the input → Gemini with a JSON schema →
 * Zod validation → deterministic validators that null out anything not in the site register.
 * An invalid output throws; the BFF reports it as a fallback and the app shows the DEMO answer.
 */
import {
  ExtractResult, HandoverDraft, ReportDraft, VerifyResult, type FrictionLog, type Sop, type SourceRef, type Theme,
} from '@mozart/schema';
import { z } from 'zod';
import type { HandoverRequest, SiteContext } from '../types';
import type { GoogleConfig } from './config';
import { generateJson } from './gemini';
import { screenPrompt } from './modelArmor';
import { CLUSTER_SYSTEM, EXTRACT_SYSTEM, HANDOVER_SYSTEM, SOP_EDIT_SYSTEM, VERIFY_SYSTEM, schemas } from './prompts';

async function guard(cfg: GoogleConfig, token: string, text: string) {
  const v = await screenPrompt(cfg, token, text);
  if (!v.allowed) throw new Error(v.reason ?? 'Blocked by Model Armor');
}

export async function extractAgent(cfg: GoogleConfig, token: string, transcript: string, ctx: SiteContext, officerZoneId?: string): Promise<ExtractResult> {
  await guard(cfg, token, transcript);
  const site = ctx.sites.find((s) => s.id === ctx.siteId)!;
  const assets = ctx.assets.filter((a) => a.siteId === ctx.siteId);
  const prompt = [
    `Officer's current zone (GPS): ${officerZoneId ?? 'unknown'}`,
    `Zones: ${site.zones.map((z) => `${z.id}=${z.name}`).join('; ')}`,
    `Assets: ${assets.map((a) => `${a.id}=${a.name} [${a.tag}]`).join('; ')}`,
    `SOPs: ${ctx.sops.map((s) => `${s.id}=${s.title}`).join('; ')}`,
    `Transcript: """${transcript}"""`,
  ].join('\n');
  const out = await generateJson(cfg, token, { model: cfg.model, system: EXTRACT_SYSTEM, prompt, responseSchema: schemas.extract },
    z.object({ draft: ReportDraft, confidence: z.record(z.string(), z.number()) }));
  const d = { ...out.data.draft };
  const conf = { ...out.data.confidence };
  // deterministic validators: ids must exist in Mozart's register for this site
  if (d.assetId && !assets.some((a) => a.id === d.assetId)) { d.assetId = null; conf.assetId = 0; }
  if (d.zoneId && !site.zones.some((z) => z.id === d.zoneId)) { d.zoneId = null; conf.zoneId = 0; }
  if (d.recommendedSopId && !ctx.sops.some((s) => s.id === d.recommendedSopId)) { d.recommendedSopId = null; conf.recommendedSopId = 0; }
  for (const k of Object.keys(d) as (keyof typeof d)[]) {
    if (d[k] === null) conf[k] = 0;
    conf[k] = Math.max(0, Math.min(1, conf[k] ?? 0.5));
  }
  return ExtractResult.parse({ draft: d, confidence: conf, model: cfg.model, latencyMs: out.latencyMs });
}

export async function verifyAgent(cfg: GoogleConfig, token: string, image: { mimeType: string; data: string }, assetId: string | undefined, ctx: SiteContext): Promise<VerifyResult> {
  const asset = ctx.assets.find((a) => a.id === assetId);
  if (!asset) throw new Error('Asset not identified: scan the QR tag first (visual match runs against the asset register in production)');
  const sop = ctx.sops.find((s) => s.id === asset.sopId);
  const prompt = [
    `Asset: ${asset.name} (${asset.tag}) at ${asset.location}`,
    `Expected states: ${asset.expectedStates.map((e) => `${e.indicator}: ${e.expected}`).join('; ')}`,
    sop ? `SOP ${sop.code} steps: ${sop.steps.map((s) => `${s.n}. ${s.text}`).join(' ')}` : 'No SOP linked.',
  ].join('\n');
  const out = await generateJson(cfg, token, { model: cfg.model, system: VERIFY_SYSTEM, prompt, image, responseSchema: schemas.verify },
    z.object({ verdict: z.enum(['pass', 'attention', 'fail']), reason: z.string(), observed: VerifyResult.shape.observed, nextStepN: z.number().nullable().optional(), confidence: z.number() }));
  const step = sop?.steps.find((s) => s.n === out.data.nextStepN);
  return VerifyResult.parse({
    assetId: asset.id, identifiedBy: 'qr', verdict: out.data.verdict, reason: out.data.reason, observed: out.data.observed,
    nextStep: sop && step ? { sopId: sop.id, n: step.n, text: step.text } : null,
    confidence: Math.max(0, Math.min(1, out.data.confidence)), lowConfidence: out.data.confidence < 0.6, model: cfg.model, latencyMs: out.latencyMs,
  });
}

export async function handoverAgent(cfg: GoogleConfig, token: string, req: Omit<HandoverRequest, 'ctx'>): Promise<HandoverDraft> {
  const me = req.officerId;
  const records = {
    workOrders: req.workOrders.filter((w) => w.assigneeId === me).map((w) => ({ id: w.id, title: w.title, status: w.status, priority: w.priority, slaDue: w.slaDue, nextStep: w.steps.find((s) => !s.done)?.label })),
    incidents: req.incidents.filter((i) => i.reporterId === me).map((i) => ({ id: i.id, type: i.type, severity: i.severity, location: i.location })),
    alarms: req.alarms.filter((a) => a.assigneeId === me && a.status !== 'resolved').map((a) => ({ id: a.id, title: a.title, status: a.status })),
    verifications: req.verifications.filter((v) => v.officerId === me).map((v) => ({ id: v.id, assetId: v.assetId, verdict: v.override ?? v.verdict, reason: v.reason })),
    frictionLogs: req.frictionLogs.filter((f) => f.officerId === me && f.createdAt >= req.shiftStart).map((f) => ({ id: f.id, text: f.text })),
    checkpoints: req.tours.filter((t) => t.officerId === me).flatMap((t) => t.checkpoints.map((c) => ({ id: c.id, name: c.name, scannedAt: c.scannedAt ?? null, dueAt: c.dueAt, note: c.note ?? null }))),
  };
  const out = await generateJson(cfg, token, { model: cfg.model, system: HANDOVER_SYSTEM, prompt: JSON.stringify(records), responseSchema: schemas.handover },
    z.object({ headline: z.string(), sections: z.array(z.object({ id: z.string(), title: z.string(), items: z.array(z.object({ id: z.string(), text: z.string(), sourceRefs: z.array(z.object({ kind: z.string(), id: z.string() })) })) })) }));
  // every source ref must point at a real record
  const known = new Map<string, SourceRef['kind']>();
  records.workOrders.forEach((r) => known.set(r.id, 'workOrder'));
  records.incidents.forEach((r) => known.set(r.id, 'incident'));
  records.alarms.forEach((r) => known.set(r.id, 'alarm'));
  records.verifications.forEach((r) => known.set(r.id, 'verification'));
  records.frictionLogs.forEach((r) => known.set(r.id, 'friction'));
  records.checkpoints.forEach((r) => known.set(r.id, 'checkpoint'));
  const sections = out.data.sections.map((s) => ({
    ...s,
    items: s.items.map((it) => ({ ...it, sourceRefs: it.sourceRefs.filter((r) => known.has(r.id)).map((r) => ({ kind: known.get(r.id)!, id: r.id })) })),
  }));
  return HandoverDraft.parse({ headline: out.data.headline, sections, model: cfg.model, latencyMs: out.latencyMs });
}

export async function clusterAgent(cfg: GoogleConfig, token: string, log: Pick<FrictionLog, 'text' | 'category'>, themes: Theme[]) {
  const open = themes.filter((t) => !t.decision);
  const prompt = `Themes:\n${open.map((t) => `${t.id}: ${t.label} (${t.category})`).join('\n')}\n\nLog (${log.category}): """${log.text}"""`;
  const out = await generateJson(cfg, token, { model: cfg.liteModel, system: CLUSTER_SYSTEM, prompt, responseSchema: schemas.cluster },
    z.object({ themeId: z.string().nullable(), sentiment: z.number(), confidence: z.number() }));
  const themeId = out.data.themeId && open.some((t) => t.id === out.data.themeId) ? out.data.themeId : null;
  return { themeId, sentiment: Math.max(-1, Math.min(1, out.data.sentiment)), confidence: out.data.confidence, model: cfg.liteModel };
}

export async function sopEditAgent(cfg: GoogleConfig, token: string, theme: Theme, sop: Sop, logs: FrictionLog[]) {
  const n = theme.sopStep ?? 1;
  const current = sop.steps.find((s) => s.n === n)?.text ?? '';
  const prompt = `SOP ${sop.code} ${sop.title}\n${sop.steps.map((s) => `${s.n}. ${s.text}`).join('\n')}\n\nStep to edit: ${n}\n\nFriction logs (${logs.length}):\n${logs.map((l) => `- [${l.siteId}] ${l.text}`).join('\n')}`;
  const out = await generateJson(cfg, token, { model: cfg.model, system: SOP_EDIT_SYSTEM, prompt, responseSchema: schemas.sopEdit }, z.object({ proposedText: z.string().min(10), rationale: z.string() }));
  return { sopId: sop.id, n, currentText: current, proposedText: out.data.proposedText, rationale: out.data.rationale, model: cfg.model };
}
