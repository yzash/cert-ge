import type {
  Asset, AskChunk, Doc, ExtractResult, FrictionLog, GuardTour, HandoverDraft, Incident, Lang, Alarm, Officer, Site, Sop, Theme,
  Verification, VerifyResult, VoiceReport, WorkOrder,
} from '@mozart/schema';

export type Mode = 'DEMO' | 'LIVE';

/** Site knowledge passed to the AI layer. In LIVE this lives in GE data stores / GEAP context. */
export interface SiteContext {
  siteId: string;
  sites: Site[];
  assets: Asset[];
  sops: Sop[];
  docs: Doc[];
}

export interface AskRequest {
  question: string;
  officerId: string;
  siteId: string;
  history: { role: 'user' | 'assistant'; text: string; topic?: string; docIds?: string[] }[];
  ctx: SiteContext;
}

export interface ExtractRequest {
  transcript: string;
  clipId?: string;
  officerId: string;
  officerZoneId?: string;
  ctx: SiteContext;
}

export interface VerifyRequest {
  /** fixture://img-id, data: URI or file: URI */
  imageUri: string;
  /** asset already identified by QR / chosen from a work-order step */
  assetId?: string;
  attempt: number;
  officerId: string;
  ctx: SiteContext;
}

export interface HandoverRequest {
  officerId: string;
  officer: Officer;
  incoming?: Officer;
  shiftStart: string;
  workOrders: WorkOrder[];
  incidents: Incident[];
  alarms: Alarm[];
  voiceReports: VoiceReport[];
  verifications: Verification[];
  frictionLogs: FrictionLog[];
  tours: GuardTour[];
  ctx: SiteContext;
}

export interface ClusterResult {
  themeId: string | null;
  sentiment: number;
  confidence: number;
  model: string;
}

export interface SopEditDraft {
  sopId: string;
  n: number;
  currentText: string;
  proposedText: string;
  rationale: string;
  model: string;
}

export interface Meta {
  mode: Mode;
  fallback?: boolean;
  fallbackReason?: string;
}

import type { Intent, RouteContext } from './router';

export interface AiProvider {
  readonly mode: Mode;
  ask(req: AskRequest): AsyncGenerator<AskChunk>;
  /** Streams partial transcripts (DEMO: scripted clip at speaking pace). */
  transcribe(clipText: string, opts?: { durationSec?: number }): AsyncGenerator<string>;
  extractReport(req: ExtractRequest): Promise<ExtractResult & { meta: Meta }>;
  verify(req: VerifyRequest): Promise<VerifyResult & { meta: Meta }>;
  generateHandover(req: HandoverRequest): Promise<HandoverDraft & { meta: Meta }>;
  clusterFriction(log: Pick<FrictionLog, 'text' | 'category' | 'sopStepRef' | 'assetId'>, themes: Theme[]): Promise<ClusterResult & { meta: Meta }>;
  draftSopEdit(theme: Theme, sop: Sop, logs: FrictionLog[]): Promise<SopEditDraft & { meta: Meta }>;
  /** Chat router: which card to show for a sentence. */
  routeIntent(text: string, ctx: RouteContext & { officerId: string }): Promise<{ intent: Intent; model: string; meta: Meta }>;
}

export interface AuditSink {
  (e: { feature: string; mode: Mode; model: string; latencyMs: number; promptHash: string; tokens: number; ok: boolean; detail?: string; officerId: string }): void;
}

export interface AiOptions {
  mode: Mode;
  bffUrl?: string;
  /** auth token from POST /auth/exchange (per-officer) */
  token?: string;
  /** 1 = realistic pacing, 0 = instant (evals/tests) */
  pace?: number;
  onAudit?: AuditSink;
  lang?: Lang;
}
