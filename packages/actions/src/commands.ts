import type {
  Claim, LeaveRequest, RobotEvent, ShiftSwap,
  Attachment, EmergencyAlert, FrictionLog, Handover, ReportDraft, ThemeDecision, Verdict, Verification, VoiceReport, WorkOrderStatus, AuditEntry,
} from '@mozart/schema';

/**
 * Commands are the only way state changes. They are queued offline with an idempotency key
 * and replayed in order on reconnect (POST /sync). The server applies the same reducer.
 */
export interface CommandBase {
  key: string; // idempotency key
  actorId: string;
  at: string;
  /** Required for any command that writes a WorkOrder, Incident or Briefing (see CONFIRM_REQUIRED). */
  confirmedBy?: string;
  confirmedAt?: string;
}

export type CommandBody =
  | { type: 'briefing.ack'; itemId: string }
  | { type: 'handover.ack'; handoverId: string }
  | { type: 'alarm.ack'; alarmId: string }
  | { type: 'wo.status'; woId: string; status: Extract<WorkOrderStatus, 'acknowledged' | 'in_progress' | 'on_hold'> }
  | { type: 'wo.step'; woId: string; stepId: string; done: boolean }
  | { type: 'wo.note'; woId: string; stepId?: string; note: string }
  | { type: 'wo.attach'; woId: string; stepId?: string; attachment: Attachment }
  | { type: 'wo.requestClose'; woId: string; signature: string }
  | { type: 'report.confirm'; report: VoiceReport; draft: ReportDraft; recordId: string; attachments: Attachment[] }
  | { type: 'verification.record'; verification: Verification }
  | { type: 'verification.override'; verificationId: string; verdict: Verdict; reason: string }
  | { type: 'friction.file'; log: FrictionLog }
  | { type: 'friction.forward'; logId: string; themeId: string | null; sentiment?: number }
  | { type: 'friction.resolveLocal'; logId: string; note: string }
  | { type: 'friction.close'; logId: string }
  | { type: 'handover.sign'; handover: Handover }
  | { type: 'closure.approve'; woId: string }
  | { type: 'closure.reject'; woId: string; reason: string }
  | { type: 'instruction.publish'; itemId: string; siteId: string; title: string; body: string; requiresAck: boolean }
  | { type: 'hq.decide'; themeId: string; decision: ThemeDecision; note: string; sopEdit?: { sopId: string; n: number; text: string }; newRecordId?: string }
  | { type: 'alert.send'; alert: EmergencyAlert }
  | { type: 'alert.ack'; alertId: string }
  | { type: 'alert.close'; alertId: string }
  | { type: 'tour.scan'; tourId: string; checkpointId: string }
  | { type: 'tour.note'; tourId: string; checkpointId: string; note: string; report?: VoiceReport }
  | { type: 'ask.escalate'; question: string; siteId: string }
  | { type: 'notification.read'; ids: string[] }
  | { type: 'audit.ai'; entry: Omit<AuditEntry, 'id' | 'at'> }
  // corporate services (in-house HR system)
  | { type: 'leave.apply'; request: LeaveRequest }
  | { type: 'leave.decide'; requestId: string; decision: 'approved' | 'rejected'; note?: string }
  | { type: 'leave.cancel'; requestId: string }
  | { type: 'claim.submit'; claim: Claim }
  | { type: 'claim.decide'; claimId: string; decision: 'approved' | 'rejected'; note?: string }
  | { type: 'swap.request'; swap: ShiftSwap }
  | { type: 'swap.decide'; swapId: string; decision: 'approved' | 'rejected' }
  | { type: 'licence.renew'; licenceId: string }
  // robots
  | { type: 'robot.command'; robotId: string; action: RobotAction; zoneIds?: string[]; missionId: string }
  | { type: 'robot.event'; event: RobotEvent }
  | { type: 'robot.task'; eventId: string; officerId: string; recordId: string }
  | { type: 'robot.dismiss'; eventId: string };

export type RobotAction = 'pause' | 'resume' | 'return_dock' | 'patrol' | 'clean' | 'goto';

export type Command = CommandBase & CommandBody;
export type CommandType = Command['type'];

/** Commands that write Mozart WorkOrder / Incident / Briefing records need a human confirmation. */
export const CONFIRM_REQUIRED: ReadonlySet<CommandType> = new Set<CommandType>([
  'report.confirm', 'wo.requestClose', 'closure.approve', 'closure.reject', 'instruction.publish', 'hq.decide', 'handover.sign', 'briefing.ack',
  // HR writes and robot commands follow the same rule: the AI drafts, a person confirms.
  'leave.apply', 'leave.decide', 'claim.submit', 'claim.decide', 'swap.request', 'swap.decide', 'licence.renew', 'robot.command', 'robot.task',
]);

let counter = 0;
export function newKey(prefix = 'k'): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Mozart-style record numbers (CWO-24xxxx / INC-24xxxx), unique enough for offline creation. */
export function newRecordNumber(prefix: 'CWO' | 'INC'): string {
  const n = (Math.floor(Date.now() / 1000) % 9000) + 1000 + Math.floor(Math.random() * 90);
  return `${prefix}-24${String(n).padStart(4, '0')}`;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

/** Build a command; pass `confirm: true` when it comes from an explicit officer tap. */
export function cmd<B extends CommandBody>(actorId: string, body: B, opts: { confirm?: boolean } = {}): CommandBase & B {
  const at = new Date().toISOString();
  return {
    key: newKey(body.type),
    actorId,
    at,
    ...(opts.confirm ? { confirmedBy: actorId, confirmedAt: at } : {}),
    ...body,
  };
}
