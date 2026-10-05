/**
 * Mozart Frontline shared schemas.
 *
 * Every entity used by the app, the BFF and the HQ view is defined here once.
 * AI outputs are validated against these schemas before use (see packages/ai).
 */
import { z } from 'zod';

// ---------- primitives ----------

export const Iso = z.string(); // ISO-8601 timestamp
export const Lang = z.enum(['en', 'ms', 'zh', 'ta']);
export type Lang = z.infer<typeof Lang>;

export const Role = z.enum(['officer', 'supervisor', 'hq']);
export type Role = z.infer<typeof Role>;

export const SourceRef = z.object({
  kind: z.enum(['workOrder', 'incident', 'voiceReport', 'verification', 'alarm', 'friction', 'handover', 'checkpoint', 'briefing', 'doc', 'robotEvent', 'leave']),
  id: z.string(),
  label: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const Attachment = z.object({
  id: z.string(),
  kind: z.enum(['photo', 'fixtureImage', 'verification', 'audio', 'signature']),
  uri: z.string(), // data: URI, file: URI or fixture://<imageId>
  caption: z.string().optional(),
  at: Iso,
});
export type Attachment = z.infer<typeof Attachment>;

// ---------- people & places ----------

export const Officer = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  role: Role,
  siteId: z.string(),
  shiftId: z.string(),
  languages: z.array(Lang),
  geSeatStatus: z.enum(['assigned', 'pending', 'reclaimed', 'standard']),
  zoneId: z.string().optional(),
  status: z.enum(['patrol', 'responding', 'task', 'break', 'blocked', 'off']).default('patrol'),
  blockedReason: z.string().optional(),
  currentTaskId: z.string().optional(),
  initials: z.string(),
  persona: z.boolean().optional(), // one of the demo personas you can sign in as
});
export type Officer = z.infer<typeof Officer>;

export const Zone = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
  // rough coordinates (metres) used for proximity ranking
  x: z.number(),
  y: z.number(),
});
export type Zone = z.infer<typeof Zone>;

export const Site = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  kind: z.string(),
  zones: z.array(Zone),
  supervisorIds: z.array(z.string()),
});
export type Site = z.infer<typeof Site>;

export const ExpectedState = z.object({
  indicator: z.string(),
  expected: z.string(),
});
export type ExpectedState = z.infer<typeof ExpectedState>;

export const AssetType = z.enum([
  'fire_panel', 'gate', 'barrier', 'alarm', 'meter', 'fire_door', 'exit_sign', 'aed', 'cctv', 'lift', 'escalator', 'pump', 'extinguisher', 'hose_reel',
]);
export type AssetType = z.infer<typeof AssetType>;

export const Asset = z.object({
  id: z.string(),
  siteId: z.string(),
  type: AssetType,
  name: z.string(),
  tag: z.string(), // QR / NFC tag id
  zoneId: z.string(),
  location: z.string(),
  expectedStates: z.array(ExpectedState),
  manualDocId: z.string().optional(),
  sopId: z.string().optional(),
  keywords: z.array(z.string()).default([]),
});
export type Asset = z.infer<typeof Asset>;

// ---------- documents (SOPs, manuals, rules, notices) ----------

export const DocSection = z.object({
  id: z.string(),
  heading: z.string(),
  body: z.string(),
});
export type DocSection = z.infer<typeof DocSection>;

export const Doc = z.object({
  id: z.string(),
  kind: z.enum(['sop', 'manual', 'siteRule', 'notice', 'incidentSummary', 'policy']),
  title: z.string(),
  siteIds: z.array(z.string()),
  version: z.string().optional(),
  sections: z.array(DocSection),
  geDocId: z.string().optional(),
});
export type Doc = z.infer<typeof Doc>;

export const SopStep = z.object({
  n: z.number(),
  text: z.string(),
  expectedState: ExpectedState.optional(),
});
export type SopStep = z.infer<typeof SopStep>;

export const Sop = z.object({
  id: z.string(),
  siteIds: z.array(z.string()),
  code: z.string(),
  title: z.string(),
  category: z.string(),
  version: z.string(),
  steps: z.array(SopStep),
  expectedStates: z.array(ExpectedState).default([]),
  effectiveFrom: Iso,
  geDocId: z.string(),
  history: z.array(z.object({ version: z.string(), at: Iso, note: z.string(), by: z.string() })).default([]),
});
export type Sop = z.infer<typeof Sop>;

// ---------- Mozart records ----------

export const WorkOrderStatus = z.enum(['assignment', 'acknowledged', 'in_progress', 'on_hold', 'pending_approval', 'closed']);
export type WorkOrderStatus = z.infer<typeof WorkOrderStatus>;

export const WorkOrderStep = z.object({
  id: z.string(),
  label: z.string(),
  done: z.boolean(),
  doneAt: Iso.optional(),
  expectedState: ExpectedState.optional(),
  verificationId: z.string().optional(),
  notes: z.array(z.string()).default([]),
  attachments: z.array(Attachment).default([]),
});
export type WorkOrderStep = z.infer<typeof WorkOrderStep>;

export const Confirmation = {
  confirmedBy: z.string().optional(),
  confirmedAt: Iso.optional(),
};

export const WorkOrder = z.object({
  id: z.string(), // CWO-xxxxxx
  type: z.enum(['corrective', 'planned', 'adhoc']),
  category: z.string(), // service category for the donut
  title: z.string(),
  description: z.string(),
  status: WorkOrderStatus,
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  siteId: z.string(),
  zoneId: z.string(),
  assetId: z.string().optional(),
  sopId: z.string().optional(),
  assigneeId: z.string(),
  steps: z.array(WorkOrderStep),
  attachments: z.array(Attachment).default([]),
  signature: z.string().optional(),
  slaDue: Iso,
  createdAt: Iso,
  source: z.enum(['mozart', 'voice', 'manual', 'hq', 'robot']).default('mozart'),
  sourceRecordId: z.string().optional(),
  closeRequestedAt: Iso.optional(),
  closedAt: Iso.optional(),
  approvedBy: z.string().optional(),
  rejectedReason: z.string().optional(),
  ...Confirmation,
});
export type WorkOrder = z.infer<typeof WorkOrder>;

export const Severity = z.enum(['low', 'medium', 'high', 'critical']);
export type Severity = z.infer<typeof Severity>;

export const Incident = z.object({
  id: z.string(), // INC-xxxxxx
  type: z.string(),
  severity: Severity,
  siteId: z.string(),
  zoneId: z.string(),
  location: z.string(),
  description: z.string(),
  sopId: z.string().optional(),
  assetId: z.string().optional(),
  reporterId: z.string(),
  attachments: z.array(Attachment).default([]),
  status: z.enum(['open', 'investigating', 'closed']),
  createdAt: Iso,
  sourceRecordId: z.string().optional(),
  ...Confirmation,
});
export type Incident = z.infer<typeof Incident>;

export const Alarm = z.object({
  id: z.string(),
  siteId: z.string(),
  assetId: z.string(),
  title: z.string(),
  severity: Severity,
  raisedAt: Iso,
  assigneeId: z.string().optional(),
  status: z.enum(['open', 'acknowledged', 'resolved']),
  workOrderId: z.string().optional(),
});
export type Alarm = z.infer<typeof Alarm>;

// ---------- AI-assisted records ----------

export const ReportType = z.enum(['incident', 'corrective_wo', 'observation', 'hazard']);
export type ReportType = z.infer<typeof ReportType>;

/** Structured draft produced by the extractor. null = the model could not infer it. */
export const ReportDraft = z.object({
  type: ReportType.nullable(),
  title: z.string().nullable(),
  zoneId: z.string().nullable(),
  location: z.string().nullable(),
  assetId: z.string().nullable(),
  severity: Severity.nullable(),
  description: z.string().nullable(),
  recommendedSopId: z.string().nullable(),
});
export type ReportDraft = z.infer<typeof ReportDraft>;

export const DraftField = z.enum(['type', 'title', 'zoneId', 'location', 'assetId', 'severity', 'description', 'recommendedSopId']);
export type DraftField = z.infer<typeof DraftField>;

export const ExtractResult = z.object({
  draft: ReportDraft,
  confidence: z.record(z.string(), z.number().min(0).max(1)),
  model: z.string(),
  latencyMs: z.number(),
});
export type ExtractResult = z.infer<typeof ExtractResult>;

export const VoiceReport = z.object({
  id: z.string(),
  officerId: z.string(),
  siteId: z.string(),
  audioUri: z.string().optional(),
  clipId: z.string().optional(),
  transcript: z.string(),
  extractedDraft: ReportDraft,
  confirmedDraft: ReportDraft.optional(),
  confidence: z.record(z.string(), z.number()),
  linkedRecordId: z.string().optional(),
  syncStatus: z.enum(['pending', 'synced']).default('synced'),
  createdAt: Iso,
  checkpointId: z.string().optional(),
  draft: z.boolean().default(false),
});
export type VoiceReport = z.infer<typeof VoiceReport>;

export const Verdict = z.enum(['pass', 'attention', 'fail']);
export type Verdict = z.infer<typeof Verdict>;

export const VerifyResult = z.object({
  assetId: z.string().nullable(),
  identifiedBy: z.enum(['qr', 'visual', 'none']),
  verdict: Verdict,
  reason: z.string(),
  observed: z.array(z.object({ indicator: z.string(), expected: z.string(), observed: z.string(), ok: z.boolean() })),
  nextStep: z.object({ sopId: z.string(), n: z.number(), text: z.string() }).nullable(),
  confidence: z.number().min(0).max(1),
  lowConfidence: z.boolean(),
  model: z.string(),
  latencyMs: z.number(),
});
export type VerifyResult = z.infer<typeof VerifyResult>;

export const Verification = z.object({
  id: z.string(),
  officerId: z.string(),
  siteId: z.string(),
  workOrderId: z.string().optional(),
  stepId: z.string().optional(),
  checkpointId: z.string().optional(),
  assetId: z.string().nullable(),
  imageUri: z.string(),
  verdict: Verdict,
  reason: z.string(),
  observed: VerifyResult.shape.observed,
  nextStep: VerifyResult.shape.nextStep,
  confidence: z.number(),
  override: Verdict.optional(),
  overrideReason: z.string().optional(),
  createdAt: Iso,
});
export type Verification = z.infer<typeof Verification>;

export const HandoverItem = z.object({
  id: z.string(),
  text: z.string(),
  sourceRefs: z.array(SourceRef),
});
export const HandoverSection = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(HandoverItem),
});
export type HandoverSection = z.infer<typeof HandoverSection>;

export const HandoverDraft = z.object({
  headline: z.string(),
  sections: z.array(HandoverSection),
  model: z.string(),
  latencyMs: z.number(),
});
export type HandoverDraft = z.infer<typeof HandoverDraft>;

export const Handover = z.object({
  id: z.string(),
  siteId: z.string(),
  shiftId: z.string(),
  outgoingId: z.string(),
  incomingId: z.string(),
  headline: z.string(),
  summary: z.array(HandoverSection),
  notes: z.string().default(''),
  signature: z.string().optional(),
  signedAt: Iso.optional(),
  acknowledgedAt: Iso.optional(),
  createdAt: Iso,
});
export type Handover = z.infer<typeof Handover>;

export const FrictionCategory = z.enum(['equipment', 'sop', 'access', 'tooling', 'safety']);
export type FrictionCategory = z.infer<typeof FrictionCategory>;

export const FrictionStatus = z.enum(['received', 'under_review', 'decided', 'closed']);
export type FrictionStatus = z.infer<typeof FrictionStatus>;

export const FrictionLog = z.object({
  id: z.string(),
  officerId: z.string(),
  officerName: z.string().optional(),
  siteId: z.string(),
  category: FrictionCategory,
  text: z.string(),
  assetId: z.string().optional(),
  sopStepRef: z.object({ sopId: z.string(), n: z.number() }).optional(),
  attachments: z.array(Attachment).default([]),
  status: FrictionStatus,
  routedTo: z.enum(['supervisor', 'hq', 'local']).default('supervisor'),
  themeId: z.string().optional(),
  sentiment: z.number().min(-1).max(1).optional(),
  decisionId: z.string().optional(),
  decisionText: z.string().optional(),
  createdAt: Iso,
  updatedAt: Iso,
});
export type FrictionLog = z.infer<typeof FrictionLog>;

export const ThemeDecision = z.enum(['changeSop', 'fixEquipment', 'noChange']);
export type ThemeDecision = z.infer<typeof ThemeDecision>;

export const Theme = z.object({
  id: z.string(),
  label: z.string(),
  summary: z.string(),
  category: FrictionCategory,
  assetType: z.string().optional(),
  sopId: z.string().optional(),
  sopStep: z.number().optional(),
  assetId: z.string().optional(),
  siteIds: z.array(z.string()),
  logIds: z.array(z.string()),
  weeks: z.array(z.object({ weekOf: Iso, count: z.number(), sentiment: z.number() })),
  sentimentScore: z.number(),
  keywords: z.array(z.string()),
  decision: ThemeDecision.optional(),
  decisionNote: z.string().optional(),
  decidedAt: Iso.optional(),
  decidedBy: z.string().optional(),
  createdAt: Iso,
});
export type Theme = z.infer<typeof Theme>;

export const BriefingItem = z.object({
  id: z.string(),
  siteId: z.string(),
  shiftDate: z.string(),
  type: z.enum(['policyUpdate', 'siteInstruction', 'alert']),
  title: z.string(),
  body: z.string(),
  sourceId: z.string().optional(),
  sopId: z.string().optional(),
  requiresAck: z.boolean(),
  ackByOfficerId: z.record(z.string(), Iso),
  createdAt: Iso,
  createdBy: z.string(),
  ...Confirmation,
});
export type BriefingItem = z.infer<typeof BriefingItem>;

export const EmergencyAlert = z.object({
  id: z.string(),
  siteId: z.string(),
  kind: z.enum(['lockdown', 'evacuation', 'bolo', 'drill']),
  title: z.string(),
  body: z.string(),
  sopId: z.string().optional(),
  sentAt: Iso,
  sentBy: z.string(),
  acks: z.record(z.string(), Iso),
  active: z.boolean(),
});
export type EmergencyAlert = z.infer<typeof EmergencyAlert>;

export const Checkpoint = z.object({
  id: z.string(),
  name: z.string(),
  zoneId: z.string(),
  tag: z.string(),
  dueAt: Iso,
  scannedAt: Iso.optional(),
  note: z.string().optional(),
  voiceReportId: z.string().optional(),
  verificationId: z.string().optional(),
});
export type Checkpoint = z.infer<typeof Checkpoint>;

export const GuardTour = z.object({
  id: z.string(),
  siteId: z.string(),
  officerId: z.string(),
  name: z.string(),
  graceMinutes: z.number(),
  checkpoints: z.array(Checkpoint),
  startedAt: Iso,
});
export type GuardTour = z.infer<typeof GuardTour>;

export const Notification = z.object({
  id: z.string(),
  officerId: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().optional(),
  at: Iso,
  read: z.boolean(),
  kind: z.enum(['friction', 'briefing', 'closure', 'handover', 'escalation', 'tour', 'alert', 'info', 'hr', 'robot']),
});
export type Notification = z.infer<typeof Notification>;

export const AuditEntry = z.object({
  id: z.string(),
  at: Iso,
  kind: z.enum(['ai_call', 'mozart_write', 'override', 'ai_failure']),
  feature: z.string(),
  officerId: z.string(),
  model: z.string().optional(),
  mode: z.enum(['DEMO', 'LIVE']).optional(),
  promptHash: z.string().optional(),
  latencyMs: z.number().optional(),
  tokens: z.number().optional(),
  recordId: z.string().optional(),
  confirmedAt: Iso.optional(),
  detail: z.string().optional(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

// ---------- Ask Mozart ----------

export const Citation = z.object({
  n: z.number(),
  docId: z.string(),
  sectionId: z.string(),
  title: z.string(),
  section: z.string(),
});
export type Citation = z.infer<typeof Citation>;

export const AskChunk = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('citation'), citation: Citation }),
  z.object({
    type: z.literal('done'),
    grounded: z.boolean(),
    lang: Lang,
    model: z.string(),
    latencyMs: z.number(),
    firstTokenMs: z.number(),
    fallback: z.boolean().optional(),
    cached: z.boolean().optional(),
  }),
]);
export type AskChunk = z.infer<typeof AskChunk>;

// ---------- corporate services (in-house HR system, assumed REST integration) ----------

export const LeaveType = z.enum(['annual', 'medical', 'childcare', 'compassionate', 'unpaid']);
export type LeaveType = z.infer<typeof LeaveType>;

export const LeaveBalance = z.object({ officerId: z.string(), type: LeaveType, entitled: z.number(), taken: z.number() });
export type LeaveBalance = z.infer<typeof LeaveBalance>;

export const LeaveRequest = z.object({
  id: z.string(),
  officerId: z.string(),
  type: LeaveType,
  from: z.string(), // YYYY-MM-DD
  to: z.string(),
  days: z.number(),
  reason: z.string().default(''),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  approverId: z.string().optional(),
  decidedAt: Iso.optional(),
  note: z.string().optional(),
  createdAt: Iso,
  ...Confirmation,
});
export type LeaveRequest = z.infer<typeof LeaveRequest>;

export const PayLine = z.object({ label: z.string(), amount: z.number() });
export const Payslip = z.object({
  id: z.string(),
  officerId: z.string(),
  period: z.string(), // YYYY-MM
  basic: z.number(),
  overtimeHours: z.number(),
  overtimePay: z.number(),
  allowances: z.array(PayLine),
  deductions: z.array(PayLine),
  gross: z.number(),
  net: z.number(),
  paidOn: z.string(),
});
export type Payslip = z.infer<typeof Payslip>;

export const Claim = z.object({
  id: z.string(),
  officerId: z.string(),
  type: z.enum(['transport', 'meal', 'medical', 'uniform', 'training']),
  amount: z.number(),
  date: z.string(),
  note: z.string().default(''),
  receiptUri: z.string().optional(),
  status: z.enum(['submitted', 'approved', 'rejected', 'paid']),
  approverId: z.string().optional(),
  decidedAt: Iso.optional(),
  createdAt: Iso,
  ...Confirmation,
});
export type Claim = z.infer<typeof Claim>;

export const RosterShift = z.object({ officerId: z.string(), date: z.string(), shiftId: z.enum(['day', 'night', 'off']), siteId: z.string() });
export type RosterShift = z.infer<typeof RosterShift>;

export const ShiftSwap = z.object({
  id: z.string(),
  officerId: z.string(),
  withOfficerId: z.string(),
  date: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  note: z.string().default(''),
  approverId: z.string().optional(),
  decidedAt: Iso.optional(),
  createdAt: Iso,
  ...Confirmation,
});
export type ShiftSwap = z.infer<typeof ShiftSwap>;

export const Licence = z.object({
  id: z.string(),
  officerId: z.string(),
  name: z.string(),
  number: z.string(),
  issuer: z.string(),
  expiresOn: z.string(),
  renewalRequestedAt: Iso.optional(),
});
export type Licence = z.infer<typeof Licence>;

// ---------- robots (patrol + cleaning) ----------

export const RobotKind = z.enum(['patrol', 'cleaning']);
export type RobotKind = z.infer<typeof RobotKind>;

export const Robot = z.object({
  id: z.string(),
  siteId: z.string(),
  kind: RobotKind,
  name: z.string(),
  model: z.string(),
  dockZoneId: z.string(),
  batteryAtSeed: z.number(),
  capabilities: z.array(z.string()),
});
export type Robot = z.infer<typeof Robot>;

export const RobotMission = z.object({
  id: z.string(),
  robotId: z.string(),
  kind: z.enum(['patrol', 'clean', 'goto', 'return']),
  waypoints: z.array(z.string()), // zone ids
  loop: z.boolean(),
  startedAt: Iso,
  status: z.enum(['active', 'paused', 'done', 'aborted']),
  pausedAt: Iso.optional(),
  pausedReason: z.string().optional(),
  pausedMs: z.number().default(0),
  from: z.object({ x: z.number(), y: z.number() }).optional(),
  createdBy: z.string(),
  ...Confirmation,
});
export type RobotMission = z.infer<typeof RobotMission>;

export const RobotEvent = z.object({
  id: z.string(),
  robotId: z.string(),
  kind: z.enum(['detection', 'obstacle', 'fault', 'low_battery']),
  label: z.string(),
  detail: z.string(),
  zoneId: z.string(),
  severity: Severity,
  at: Iso,
  imageUri: z.string().optional(),
  suggestedSopId: z.string().optional(),
  status: z.enum(['open', 'tasked', 'resolved', 'dismissed']),
  workOrderId: z.string().optional(),
  assigneeId: z.string().optional(),
});
export type RobotEvent = z.infer<typeof RobotEvent>;

// ---------- whole demo state (what Mozart + Firestore hold) ----------

export const DemoState = z.object({
  schemaVersion: z.number(),
  seededAt: Iso,
  seq: z.number(),
  officers: z.array(Officer),
  sites: z.array(Site),
  assets: z.array(Asset),
  sops: z.array(Sop),
  docs: z.array(Doc),
  workOrders: z.array(WorkOrder),
  incidents: z.array(Incident),
  alarms: z.array(Alarm),
  voiceReports: z.array(VoiceReport),
  verifications: z.array(Verification),
  handovers: z.array(Handover),
  frictionLogs: z.array(FrictionLog),
  themes: z.array(Theme),
  briefingItems: z.array(BriefingItem),
  alerts: z.array(EmergencyAlert),
  tours: z.array(GuardTour),
  notifications: z.array(Notification),
  audit: z.array(AuditEntry),
  processedKeys: z.array(z.string()),
  // corporate services
  leaveBalances: z.array(LeaveBalance),
  leaveRequests: z.array(LeaveRequest),
  payslips: z.array(Payslip),
  claims: z.array(Claim),
  roster: z.array(RosterShift),
  shiftSwaps: z.array(ShiftSwap),
  licences: z.array(Licence),
  // robots
  robots: z.array(Robot),
  robotMissions: z.array(RobotMission),
  robotEvents: z.array(RobotEvent),
});
export type DemoState = z.infer<typeof DemoState>;
