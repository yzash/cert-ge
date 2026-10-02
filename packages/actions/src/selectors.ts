import type { BriefingItem, Checkpoint, DemoState, GuardTour, Officer, WorkOrder, Zone } from '@mozart/schema';

const LEVEL_ORDER: Record<string, number> = { B3: -3, B2: -2, B1: -1, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5, R: 6 };

/** Approximate walking distance in metres between two zones (level changes cost 30 m each). */
export function zoneDistance(a?: Zone, b?: Zone): number {
  if (!a || !b) return 200;
  const flat = Math.hypot(a.x - b.x, a.y - b.y);
  const lv = Math.abs((LEVEL_ORDER[a.level] ?? 0) - (LEVEL_ORDER[b.level] ?? 0));
  return Math.round(flat + lv * 30);
}

export function zoneOf(s: DemoState, siteId: string, zoneId?: string): Zone | undefined {
  return s.sites.find((x) => x.id === siteId)?.zones.find((z) => z.id === zoneId);
}

export interface RankedTask {
  wo: WorkOrder;
  minutesToSla: number;
  distanceM: number;
  breached: boolean;
}

/** F1 ranking: nearest SLA breach first, proximity breaks ties within a 10-minute band. */
export function rankTasks(s: DemoState, officerId: string, now = Date.now()): RankedTask[] {
  const me = s.officers.find((o) => o.id === officerId);
  const myZone = me ? zoneOf(s, me.siteId, me.zoneId) : undefined;
  return s.workOrders
    .filter((w) => w.assigneeId === officerId && ['assignment', 'acknowledged', 'in_progress'].includes(w.status))
    .map((wo) => {
      const minutesToSla = Math.round((Date.parse(wo.slaDue) - now) / 60000);
      return { wo, minutesToSla, distanceM: zoneDistance(myZone, zoneOf(s, wo.siteId, wo.zoneId)), breached: minutesToSla < 0 };
    })
    .sort((a, b) => {
      const band = Math.floor(a.minutesToSla / 10) - Math.floor(b.minutesToSla / 10);
      if (Math.abs(a.minutesToSla - b.minutesToSla) > 10 || band !== 0) return a.minutesToSla - b.minutesToSla;
      return a.distanceM - b.distanceM;
    });
}

export function briefingFor(s: DemoState, officer: Officer): BriefingItem[] {
  return s.briefingItems
    .filter((b) => b.siteId === officer.siteId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unackedBriefing(s: DemoState, officer: Officer): BriefingItem[] {
  return briefingFor(s, officer).filter((b) => b.requiresAck && !b.ackByOfficerId[officer.id]);
}

export function checkpointState(cp: Checkpoint, tour: GuardTour, now = Date.now()): 'scanned' | 'missed' | 'due' | 'upcoming' {
  if (cp.scannedAt) return 'scanned';
  const due = Date.parse(cp.dueAt);
  if (now > due + tour.graceMinutes * 60000) return 'missed';
  if (now > due - 10 * 60000) return 'due';
  return 'upcoming';
}

export function missedCheckpoints(s: DemoState, siteId: string, now = Date.now()) {
  const out: { tour: GuardTour; cp: Checkpoint; officer?: Officer }[] = [];
  for (const t of s.tours.filter((x) => x.siteId === siteId)) {
    for (const cp of t.checkpoints) if (checkpointState(cp, t, now) === 'missed') out.push({ tour: t, cp, officer: s.officers.find((o) => o.id === t.officerId) });
  }
  return out;
}

/** Officers on the supervisor's shift board. */
export function shiftBoard(s: DemoState, supervisorId: string) {
  const sup = s.officers.find((o) => o.id === supervisorId);
  if (!sup) return [];
  return s.officers
    .filter((o) => o.siteId === sup.siteId && o.role === 'officer' && o.shiftId === sup.shiftId)
    .map((o) => {
      const active = s.workOrders.filter((w) => w.assigneeId === o.id && ['acknowledged', 'in_progress'].includes(w.status));
      const current = s.workOrders.find((w) => w.id === o.currentTaskId) ?? active[0];
      const onHold = s.workOrders.filter((w) => w.assigneeId === o.id && w.status === 'on_hold');
      const breached = s.workOrders.filter((w) => w.assigneeId === o.id && ['assignment', 'acknowledged', 'in_progress'].includes(w.status) && Date.parse(w.slaDue) < Date.now());
      const blocked = o.status === 'blocked' || breached.length > 0;
      const reason = o.blockedReason ?? (breached.length ? `SLA breached: ${breached[0].id}` : undefined);
      return { officer: o, current, onHold, blocked, reason, zone: zoneOf(s, o.siteId, o.zoneId) };
    });
}

export function kpis(s: DemoState) {
  const voice = s.voiceReports.filter((v) => v.linkedRecordId);
  const corrective = s.workOrders.filter((w) => w.type === 'corrective' && (w.status === 'closed' || w.status === 'pending_approval'));
  const withEvidence = corrective.filter((w) => w.attachments.length || w.steps.some((st) => st.verificationId || st.attachments.length));
  const policy = s.briefingItems.filter((b) => b.type === 'policyUpdate' && b.siteId === 'CNP');
  const cnpOfficers = s.officers.filter((o) => o.siteId === 'CNP' && o.role === 'officer' && o.shiftId === 'night').length;
  const ackRate = policy.length ? policy.reduce((a, b) => a + Object.keys(b.ackByOfficerId).length / cnpOfficers, 0) / policy.length : 0;
  const decided = s.themes.filter((t) => t.decidedAt);
  const daysToDecision = decided.length
    ? decided.reduce((a, t) => {
      const firstLog = s.frictionLogs.filter((f) => t.logIds.includes(f.id)).map((f) => Date.parse(f.createdAt)).sort()[0] ?? Date.parse(t.createdAt);
      return a + (Date.parse(t.decidedAt!) - Math.max(firstLog, Date.parse(t.decidedAt!) - 30 * 86400_000)) / 86400_000;
    }, 0) / decided.length
    : 0;
  return {
    voiceReports: voice.length,
    evidenceRate: corrective.length ? withEvidence.length / corrective.length : 1,
    briefingAckRate: Math.min(1, ackRate),
    frictionOpen: s.frictionLogs.filter((f) => f.status === 'under_review' || f.status === 'received').length,
    themesOpen: s.themes.filter((t) => !t.decision).length,
    daysToDecision,
  };
}
