/**
 * The Mozart action layer for the demo: a pure reducer applied identically on the device
 * (optimistic, offline) and on the server (/sync). Enforces the no-write-without-confirm invariant.
 */
import type {
  LeaveRequest,
  AuditEntry, BriefingItem, DemoState, Doc, Incident, Notification, Sop, Theme, WorkOrder, WorkOrderStep,
} from '@mozart/schema';
import { CONFIRM_REQUIRED, type Command } from './commands';
import { robotPose } from './robots';

export class ActionRejected extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const MAX_KEYS = 800;
const MAX_AUDIT = 400;

type Draft = DemoState;

function upd<T extends { id: string }>(arr: T[], id: string, fn: (x: T) => T): T[] {
  let found = false;
  const out = arr.map((x) => {
    if (x.id !== id) return x;
    found = true;
    return fn(x);
  });
  if (!found) throw new ActionRejected('not_found', `Record ${id} not found`);
  return out;
}

function notify(s: Draft, n: Omit<Notification, 'id' | 'read'>): Draft {
  return { ...s, notifications: [{ ...n, id: `N-${s.seq}-${s.notifications.length}`, read: false }, ...s.notifications].slice(0, 300) };
}

function audit(s: Draft, e: Omit<AuditEntry, 'id'>): Draft {
  return { ...s, audit: [{ ...e, id: `AU-${s.seq}-${s.audit.length}` }, ...s.audit].slice(0, MAX_AUDIT) };
}

function supervisorsOf(s: Draft, siteId: string): string[] {
  return s.sites.find((x) => x.id === siteId)?.supervisorIds ?? [];
}

function officerSite(s: Draft, id: string): string {
  return s.officers.find((o) => o.id === id)?.siteId ?? 'CNP';
}

function name(s: Draft, id: string): string {
  return s.officers.find((o) => o.id === id)?.name ?? id;
}

const SLA_HOURS = { critical: 1, high: 2, medium: 24, low: 72 } as const;

function bumpVersion(v: string): string {
  const [maj, min = '0'] = v.split('.');
  return `${maj}.${Number(min) + 1}`;
}

/** Apply one command. Throws ActionRejected for invalid commands. Idempotent by `key`. */
export function apply(state: DemoState, c: Command): DemoState {
  if (state.processedKeys.includes(c.key)) return state;

  if (CONFIRM_REQUIRED.has(c.type) && (!c.confirmedBy || !c.confirmedAt)) {
    throw new ActionRejected('unconfirmed', `${c.type} writes a Mozart record and needs confirmedBy/confirmedAt (human tap)`);
  }

  let s: Draft = { ...state, seq: state.seq + 1, processedKeys: [...state.processedKeys, c.key].slice(-MAX_KEYS) };
  const at = c.at;

  switch (c.type) {
    case 'briefing.ack': {
      s.briefingItems = upd(s.briefingItems, c.itemId, (b) => ({ ...b, ackByOfficerId: { ...b.ackByOfficerId, [c.actorId]: at } }));
      // Acknowledging an SOP update closes the loop on friction logs that caused it.
      const item = s.briefingItems.find((b) => b.id === c.itemId)!;
      if (item.sourceId) {
        s.frictionLogs = s.frictionLogs.map((f) =>
          f.officerId === c.actorId && f.decisionId === item.sourceId && f.status === 'decided' ? { ...f, status: 'closed', updatedAt: at } : f);
      }
      break;
    }
    case 'handover.ack': {
      s.handovers = upd(s.handovers, c.handoverId, (h) => ({ ...h, acknowledgedAt: at }));
      const h = s.handovers.find((x) => x.id === c.handoverId)!;
      for (const sup of supervisorsOf(s, h.siteId)) s = notify(s, { officerId: sup, kind: 'handover', title: 'Handover acknowledged', body: `${name(s, c.actorId)} acknowledged ${name(s, h.outgoingId)}’s handover.`, at });
      break;
    }
    case 'alarm.ack':
      s.alarms = upd(s.alarms, c.alarmId, (a) => ({ ...a, status: a.status === 'open' ? 'acknowledged' : a.status }));
      break;

    case 'wo.status':
      s.workOrders = upd(s.workOrders, c.woId, (w) => ({ ...w, status: c.status }));
      if (c.status === 'acknowledged' || c.status === 'in_progress') {
        const wo = s.workOrders.find((w) => w.id === c.woId)!;
        s.alarms = s.alarms.map((a) => (a.workOrderId === wo.id && a.status === 'open' ? { ...a, status: 'acknowledged' } : a));
        s.officers = s.officers.map((o) => (o.id === c.actorId ? { ...o, currentTaskId: wo.id, status: c.status === 'in_progress' ? 'task' : o.status } : o));
      }
      break;

    case 'wo.step':
      s.workOrders = upd(s.workOrders, c.woId, (w) => ({
        ...w,
        status: w.status === 'assignment' || w.status === 'acknowledged' ? 'in_progress' : w.status,
        steps: w.steps.map((st) => (st.id === c.stepId ? { ...st, done: c.done, doneAt: c.done ? at : undefined } : st)),
      }));
      break;

    case 'wo.note':
      s.workOrders = upd(s.workOrders, c.woId, (w) => ({
        ...w,
        steps: c.stepId ? w.steps.map((st) => (st.id === c.stepId ? { ...st, notes: [...st.notes, c.note] } : st)) : w.steps,
        description: c.stepId ? w.description : `${w.description}\n• ${c.note}`,
      }));
      break;

    case 'wo.attach':
      s.workOrders = upd(s.workOrders, c.woId, (w) => ({
        ...w,
        attachments: c.stepId ? w.attachments : [...w.attachments, c.attachment],
        steps: c.stepId ? w.steps.map((st) => (st.id === c.stepId ? { ...st, attachments: [...st.attachments, c.attachment] } : st)) : w.steps,
      }));
      break;

    case 'wo.requestClose': {
      const wo = s.workOrders.find((w) => w.id === c.woId);
      if (!wo) throw new ActionRejected('not_found', `Record ${c.woId} not found`);
      if (!hasEvidence(wo)) throw new ActionRejected('no_evidence', 'Close requires evidence: attach a photo or a verification first (SOP-OPS-004)');
      s.workOrders = upd(s.workOrders, c.woId, (w) => ({
        ...w,
        status: 'pending_approval',
        signature: c.signature,
        closeRequestedAt: at,
        rejectedReason: undefined,
        confirmedBy: c.confirmedBy,
        confirmedAt: c.confirmedAt,
        steps: w.steps.map((st, i) => (i === w.steps.length - 1 ? { ...st, done: true, doneAt: at } : st)),
      }));
      if (wo.source === 'robot' && wo.sourceRecordId) {
        s.robotEvents = s.robotEvents.map((e) => (e.id === wo.sourceRecordId ? { ...e, status: 'resolved' } : e));
        s = resumeRobotFor(s, wo.sourceRecordId, Date.parse(at));
      }
      for (const sup of supervisorsOf(s, wo.siteId)) s = notify(s, { officerId: sup, kind: 'closure', title: 'Closure to approve', body: `${name(s, c.actorId)} closed ${wo.id}: ${wo.title}`, at, link: `/wo/${wo.id}` });
      s = audit(s, { at, kind: 'mozart_write', feature: 'wo.close', officerId: c.actorId, recordId: wo.id, confirmedAt: c.confirmedAt });
      break;
    }

    case 'closure.approve': {
      s.workOrders = upd(s.workOrders, c.woId, (w) => {
        if (w.status !== 'pending_approval') throw new ActionRejected('bad_state', `${w.id} is not awaiting approval`);
        return { ...w, status: 'closed', closedAt: at, approvedBy: c.actorId };
      });
      const wo = s.workOrders.find((w) => w.id === c.woId)!;
      s.alarms = s.alarms.map((a) => (a.workOrderId === wo.id ? { ...a, status: 'resolved' } : a));
      s.officers = s.officers.map((o) => (o.currentTaskId === wo.id ? { ...o, currentTaskId: undefined, status: o.status === 'task' ? 'patrol' : o.status } : o));
      s = notify(s, { officerId: wo.assigneeId, kind: 'closure', title: 'Closure approved', body: `${wo.id} ${wo.title} approved by ${name(s, c.actorId)}.`, at, link: `/wo/${wo.id}` });
      s = audit(s, { at, kind: 'mozart_write', feature: 'closure.approve', officerId: c.actorId, recordId: wo.id, confirmedAt: c.confirmedAt });
      break;
    }
    case 'closure.reject': {
      s.workOrders = upd(s.workOrders, c.woId, (w) => ({ ...w, status: 'in_progress', rejectedReason: c.reason }));
      const wo = s.workOrders.find((w) => w.id === c.woId)!;
      s = notify(s, { officerId: wo.assigneeId, kind: 'closure', title: 'Closure returned', body: `${wo.id}: ${c.reason}`, at, link: `/wo/${wo.id}` });
      s = audit(s, { at, kind: 'mozart_write', feature: 'closure.reject', officerId: c.actorId, recordId: wo.id, confirmedAt: c.confirmedAt });
      break;
    }

    case 'report.confirm': {
      const d = c.draft;
      if (!d.type) throw new ActionRejected('incomplete', 'Report type is required');
      if (!d.description && !d.title) throw new ActionRejected('incomplete', 'Description is required');
      const siteId = c.report.siteId;
      const zoneId = d.zoneId ?? s.officers.find((o) => o.id === c.actorId)?.zoneId ?? 'z-l1-atrium';
      const zoneName = s.sites.find((x) => x.id === siteId)?.zones.find((z) => z.id === zoneId)?.name ?? zoneId;
      const severity = d.severity ?? 'medium';
      if (d.type === 'corrective_wo' || d.type === 'hazard') {
        const steps: WorkOrderStep[] = [
          { id: 's1', label: 'Inform operator (FCC)', done: false, notes: [], attachments: [] },
          { id: 's2', label: d.type === 'hazard' ? 'Make safe / cordon off' : 'Rectify', done: false, notes: [], attachments: [] },
          { id: 's3', label: 'Close the job with evidence', done: false, notes: [], attachments: [] },
        ];
        const asset = s.assets.find((a) => a.id === d.assetId);
        if (asset?.expectedStates.length) steps.splice(1, 0, { id: 'sv', label: 'Verify asset state', done: false, expectedState: asset.expectedStates[0], notes: [], attachments: [] });
        const wo: WorkOrder = {
          id: c.recordId, type: 'corrective', category: d.type === 'hazard' ? 'Hazard' : categoryFor(asset?.type),
          title: d.title ?? d.description!.slice(0, 60), description: d.description ?? '', status: 'in_progress', priority: severity,
          siteId, zoneId, assetId: d.assetId ?? undefined, sopId: d.recommendedSopId ?? undefined, assigneeId: c.actorId, steps,
          attachments: c.attachments, slaDue: new Date(Date.parse(at) + SLA_HOURS[severity] * 3600_000).toISOString(), createdAt: at,
          source: 'voice', sourceRecordId: c.report.id, confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt,
        };
        s.workOrders = [wo, ...s.workOrders];
      } else {
        const inc: Incident = {
          id: c.recordId, type: d.type === 'observation' ? 'Observation' : d.title ?? 'Incident', severity, siteId, zoneId,
          location: d.location ?? zoneName, description: d.description ?? '', sopId: d.recommendedSopId ?? undefined, assetId: d.assetId ?? undefined,
          reporterId: c.actorId, attachments: c.attachments, status: 'open', createdAt: at, sourceRecordId: c.report.id,
          confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt,
        };
        s.incidents = [inc, ...s.incidents];
        if (severity === 'high' || severity === 'critical') {
          for (const sup of supervisorsOf(s, siteId)) s = notify(s, { officerId: sup, kind: 'escalation', title: `${severity.toUpperCase()} incident`, body: `${inc.id}: ${d.title ?? inc.type} at ${inc.location}`, at });
        }
      }
      s.voiceReports = [{ ...c.report, confirmedDraft: d, linkedRecordId: c.recordId, syncStatus: 'synced', draft: false }, ...s.voiceReports];
      s = audit(s, { at, kind: 'mozart_write', feature: 'report.confirm', officerId: c.actorId, recordId: c.recordId, confirmedAt: c.confirmedAt });
      break;
    }

    case 'verification.record': {
      const v = c.verification;
      s.verifications = [v, ...s.verifications.filter((x) => x.id !== v.id)];
      if (v.workOrderId) {
        s.workOrders = upd(s.workOrders, v.workOrderId, (w) => ({
          ...w,
          status: w.status === 'assignment' || w.status === 'acknowledged' ? 'in_progress' : w.status,
          steps: w.steps.map((st) => (st.id === v.stepId ? { ...st, verificationId: v.id, done: true, doneAt: at } : st)),
          attachments: v.stepId ? w.attachments : [...w.attachments, { id: `att-${v.id}`, kind: 'verification', uri: v.imageUri, caption: `${v.verdict.toUpperCase()}: ${v.reason.slice(0, 60)}`, at }],
        }));
      }
      if (v.checkpointId) {
        s.tours = s.tours.map((t) => ({ ...t, checkpoints: t.checkpoints.map((cp) => (cp.id === v.checkpointId ? { ...cp, verificationId: v.id } : cp)) }));
      }
      break;
    }
    case 'verification.override':
      s.verifications = upd(s.verifications, c.verificationId, (v) => ({ ...v, override: c.verdict, overrideReason: c.reason }));
      s = audit(s, { at, kind: 'override', feature: 'verify', officerId: c.actorId, recordId: c.verificationId, detail: `${c.verdict}: ${c.reason}` });
      break;

    case 'friction.file': {
      s.frictionLogs = [{ ...c.log, status: 'received', routedTo: 'supervisor', createdAt: at, updatedAt: at }, ...s.frictionLogs];
      for (const sup of supervisorsOf(s, c.log.siteId)) s = notify(s, { officerId: sup, kind: 'friction', title: 'New friction log', body: `${name(s, c.actorId)}: ${c.log.text.slice(0, 80)}`, at });
      break;
    }
    case 'friction.forward': {
      s.frictionLogs = upd(s.frictionLogs, c.logId, (f) => ({ ...f, status: 'under_review', routedTo: 'hq', themeId: c.themeId ?? undefined, sentiment: c.sentiment ?? f.sentiment, updatedAt: at }));
      const log = s.frictionLogs.find((f) => f.id === c.logId)!;
      if (c.themeId) {
        s.themes = upd(s.themes, c.themeId, (t) => addLogToTheme(t, log.id, log.siteId, c.sentiment ?? -0.5));
      } else {
        // new emerging theme of one
        const t: Theme = {
          id: `th-new-${log.id}`, label: log.text.slice(0, 60), summary: log.text, category: log.category, siteIds: [log.siteId], logIds: [log.id],
          weeks: Array.from({ length: 8 }, (_, i) => ({ weekOf: new Date(Date.parse(at) - (7 - i) * 7 * 86400_000).toISOString(), count: i === 7 ? 1 : 0, sentiment: i === 7 ? c.sentiment ?? -0.4 : 0 })),
          sentimentScore: c.sentiment ?? -0.4, keywords: [], createdAt: at, sopId: log.sopStepRef?.sopId, sopStep: log.sopStepRef?.n, assetId: log.assetId,
        };
        s.themes = [t, ...s.themes];
        s.frictionLogs = upd(s.frictionLogs, log.id, (f) => ({ ...f, themeId: t.id }));
      }
      s = notify(s, { officerId: log.officerId, kind: 'friction', title: 'Friction log under review', body: `Forwarded to HQ by ${name(s, c.actorId)}: “${log.text.slice(0, 60)}”`, at, link: '/friction' });
      break;
    }
    case 'friction.resolveLocal': {
      s.frictionLogs = upd(s.frictionLogs, c.logId, (f) => ({ ...f, status: 'decided', routedTo: 'local', decisionText: c.note, decisionId: `dec-local-${f.id}`, updatedAt: at }));
      const log = s.frictionLogs.find((f) => f.id === c.logId)!;
      s = notify(s, { officerId: log.officerId, kind: 'friction', title: 'Friction log decided', body: c.note, at, link: '/friction' });
      break;
    }
    case 'friction.close':
      s.frictionLogs = upd(s.frictionLogs, c.logId, (f) => ({ ...f, status: 'closed', updatedAt: at }));
      break;

    case 'handover.sign': {
      const h = { ...c.handover, signedAt: at, createdAt: c.handover.createdAt ?? at };
      s.handovers = [h, ...s.handovers.filter((x) => x.id !== h.id)];
      s = notify(s, { officerId: h.incomingId, kind: 'handover', title: 'Handover waiting', body: `${name(s, h.outgoingId)} signed the handover: ${h.headline}`, at, link: `/handover/${h.id}` });
      for (const sup of supervisorsOf(s, h.siteId)) s = notify(s, { officerId: sup, kind: 'handover', title: 'Handover signed', body: `${name(s, h.outgoingId)} → ${name(s, h.incomingId)}`, at, link: `/handover/${h.id}` });
      s = audit(s, { at, kind: 'mozart_write', feature: 'handover.sign', officerId: c.actorId, recordId: h.id, confirmedAt: c.confirmedAt });
      break;
    }

    case 'instruction.publish': {
      const item: BriefingItem = {
        id: c.itemId, siteId: c.siteId, shiftDate: at.slice(0, 10), type: 'siteInstruction', title: c.title, body: c.body, requiresAck: c.requiresAck,
        ackByOfficerId: {}, createdAt: at, createdBy: c.actorId, confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt,
      };
      s.briefingItems = [item, ...s.briefingItems];
      s = audit(s, { at, kind: 'mozart_write', feature: 'instruction.publish', officerId: c.actorId, recordId: item.id, confirmedAt: c.confirmedAt });
      break;
    }

    case 'hq.decide': {
      const theme = s.themes.find((t) => t.id === c.themeId);
      if (!theme) throw new ActionRejected('not_found', `Theme ${c.themeId} not found`);
      if (theme.decision) throw new ActionRejected('bad_state', 'Theme already decided');
      if (!c.note.trim()) throw new ActionRejected('incomplete', 'A decision note is required');
      const decisionId = `dec-${theme.id}-${s.seq}`;
      let decisionText = c.note;

      if (c.decision === 'changeSop') {
        if (!c.sopEdit) throw new ActionRejected('incomplete', 'Change SOP needs the edited step');
        const { sopId, n, text } = c.sopEdit;
        let newVersion = '';
        s.sops = upd(s.sops, sopId, (sop: Sop) => {
          newVersion = bumpVersion(sop.version);
          return {
            ...sop,
            version: newVersion,
            effectiveFrom: at,
            steps: sop.steps.map((st) => (st.n === n ? { ...st, text } : st)),
            history: [...sop.history, { version: newVersion, at, note: `step ${n} updated: ${theme.label}`, by: c.actorId }],
          };
        });
        s.docs = s.docs.map((d: Doc) => (d.id === sopId ? { ...d, version: newVersion, sections: d.sections.map((sec) => (sec.id === `s${n}` ? { ...sec, body: text } : sec)) } : d));
        const sop = s.sops.find((x) => x.id === sopId)!;
        decisionText = `SOP changed: ${sop.code} v${newVersion} step ${n} now reads “${text}” ${c.note ? `— ${c.note}` : ''}`.trim();
        const sitesAffected = [...new Set([...theme.siteIds])];
        sitesAffected.forEach((siteId, i) => {
          s.briefingItems = [{
            id: `BRF-${s.seq}-${i}`, siteId, shiftDate: at.slice(0, 10), type: 'policyUpdate',
            title: `${sop.code} v${newVersion}: step ${n} updated`,
            body: `${text}\n\nWhy: ${c.note}`,
            sourceId: decisionId, sopId, requiresAck: true, ackByOfficerId: {}, createdAt: at, createdBy: c.actorId,
            confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt,
          }, ...s.briefingItems];
        });
      } else if (c.decision === 'fixEquipment') {
        const asset = s.assets.find((a) => a.id === theme.assetId);
        const siteId = asset?.siteId ?? theme.siteIds[0];
        const tech = s.officers.find((o) => o.siteId === siteId && o.title.includes('IFM'))?.id ?? s.officers[0].id;
        const wo: WorkOrder = {
          id: c.newRecordId ?? `CWO-HQ${s.seq}`, type: 'corrective', category: categoryFor(asset?.type), title: `HQ: ${theme.label}`,
          description: `${c.note}\n\nRaised from HQ theme ${theme.id} (${theme.logIds.length} friction logs).`, status: 'assignment', priority: 'medium',
          siteId, zoneId: asset?.zoneId ?? s.sites.find((x) => x.id === siteId)!.zones[0].id, assetId: asset?.id, assigneeId: tech,
          steps: [
            { id: 's1', label: 'Inform operator', done: false, notes: [], attachments: [] },
            { id: 's2', label: 'Rectify', done: false, notes: [], attachments: [] },
            { id: 's3', label: 'Close the job with evidence', done: false, notes: [], attachments: [] },
          ],
          attachments: [], slaDue: new Date(Date.parse(at) + 72 * 3600_000).toISOString(), createdAt: at, source: 'hq',
          confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt,
        };
        s.workOrders = [wo, ...s.workOrders];
        decisionText = `Equipment fix ordered (${wo.id}): ${c.note}`;
      } else {
        decisionText = `No change: ${c.note}`;
      }

      s.themes = upd(s.themes, theme.id, (t) => ({ ...t, decision: c.decision, decisionNote: c.note, decidedAt: at, decidedBy: c.actorId }));
      const affected = new Set<string>();
      s.frictionLogs = s.frictionLogs.map((f) => {
        if (!theme.logIds.includes(f.id)) return f;
        affected.add(f.officerId);
        return { ...f, status: 'decided', decisionId, decisionText, updatedAt: at };
      });
      for (const officerId of affected) {
        if (s.officers.some((o) => o.id === officerId)) {
          s = notify(s, { officerId, kind: 'friction', title: 'HQ decided on your friction log', body: decisionText, at, link: '/friction' });
        }
      }
      s = audit(s, { at, kind: 'mozart_write', feature: `hq.decide.${c.decision}`, officerId: c.actorId, recordId: decisionId, confirmedAt: c.confirmedAt });
      break;
    }

    case 'alert.send':
      s.alerts = [{ ...c.alert, sentAt: at, acks: {}, active: true }, ...s.alerts.map((a) => ({ ...a, active: false }))];
      break;
    case 'alert.ack':
      s.alerts = upd(s.alerts, c.alertId, (a) => ({ ...a, acks: { ...a.acks, [c.actorId]: a.acks[c.actorId] ?? at } }));
      break;
    case 'alert.close':
      s.alerts = upd(s.alerts, c.alertId, (a) => ({ ...a, active: false }));
      break;

    case 'tour.scan':
      s.tours = upd(s.tours, c.tourId, (t) => ({ ...t, checkpoints: t.checkpoints.map((cp) => (cp.id === c.checkpointId ? { ...cp, scannedAt: cp.scannedAt ?? at } : cp)) }));
      break;
    case 'tour.note':
      s.tours = upd(s.tours, c.tourId, (t) => ({
        ...t,
        checkpoints: t.checkpoints.map((cp) => (cp.id === c.checkpointId ? { ...cp, note: c.note, voiceReportId: c.report?.id ?? cp.voiceReportId } : cp)),
      }));
      if (c.report) s.voiceReports = [{ ...c.report, checkpointId: c.checkpointId, draft: false }, ...s.voiceReports];
      break;

    case 'ask.escalate':
      for (const sup of supervisorsOf(s, c.siteId)) s = notify(s, { officerId: sup, kind: 'escalation', title: 'Question escalated', body: `${name(s, c.actorId)} asked: “${c.question}” (not in site documents)`, at });
      break;

    case 'notification.read':
      s.notifications = s.notifications.map((n) => (c.ids.includes(n.id) ? { ...n, read: true } : n));
      break;

    case 'audit.ai':
      s = audit(s, { ...c.entry, at });
      break;


    // ---------------- corporate services ----------------
    case 'leave.apply': {
      const r = c.request;
      if (r.officerId !== c.actorId) throw new ActionRejected('forbidden', 'You can only apply for your own leave');
      if (r.from > r.to || r.days <= 0) throw new ActionRejected('incomplete', 'Check the leave dates');
      const bal = s.leaveBalances.find((b) => b.officerId === r.officerId && b.type === r.type);
      const pending = s.leaveRequests.filter((x) => x.officerId === r.officerId && x.type === r.type && x.status === 'pending').reduce((a, x) => a + x.days, 0);
      if (bal && r.type !== 'unpaid' && bal.entitled - bal.taken - pending < r.days) {
        throw new ActionRejected('insufficient_balance', `Not enough ${r.type} leave: ${bal.entitled - bal.taken - pending} day(s) left`);
      }
      s.leaveRequests = [{ ...r, status: 'pending', createdAt: at, confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt }, ...s.leaveRequests];
      for (const sup of supervisorsOf(s, officerSite(s, r.officerId))) s = notify(s, { officerId: sup, kind: 'hr', title: 'Leave to approve', body: `${name(s, r.officerId)}: ${r.days} day(s) ${r.type} leave, ${r.from}${r.to !== r.from ? ` to ${r.to}` : ''}`, at });
      s = audit(s, { at, kind: 'mozart_write', feature: 'hr.leave.apply', officerId: c.actorId, recordId: r.id, confirmedAt: c.confirmedAt });
      break;
    }
    case 'leave.decide': {
      requireRole(s, c.actorId, ['supervisor', 'hq']);
      let decided: LeaveRequest | undefined;
      s.leaveRequests = upd(s.leaveRequests, c.requestId, (r) => {
        if (r.status !== 'pending') throw new ActionRejected('bad_state', 'This request was already decided');
        decided = { ...r, status: c.decision, approverId: c.actorId, decidedAt: at, note: c.note };
        return decided;
      });
      if (c.decision === 'approved') s.leaveBalances = s.leaveBalances.map((b) => (b.officerId === decided!.officerId && b.type === decided!.type ? { ...b, taken: b.taken + decided!.days } : b));
      s = notify(s, { officerId: decided!.officerId, kind: 'hr', title: `Leave ${c.decision}`, body: `${decided!.days} day(s) ${decided!.type} leave from ${decided!.from}${c.note ? `: ${c.note}` : ''}`, at, link: '/v2/requests' });
      s = audit(s, { at, kind: 'mozart_write', feature: 'hr.leave.decide', officerId: c.actorId, recordId: c.requestId, confirmedAt: c.confirmedAt });
      break;
    }
    case 'leave.cancel': {
      let was: LeaveRequest | undefined;
      s.leaveRequests = upd(s.leaveRequests, c.requestId, (r) => {
        if (r.officerId !== c.actorId) throw new ActionRejected('forbidden', 'Not your request');
        was = r;
        return { ...r, status: 'cancelled', decidedAt: at };
      });
      if (was?.status === 'approved') s.leaveBalances = s.leaveBalances.map((b) => (b.officerId === was!.officerId && b.type === was!.type ? { ...b, taken: Math.max(0, b.taken - was!.days) } : b));
      break;
    }
    case 'claim.submit': {
      const cl = c.claim;
      if (cl.officerId !== c.actorId) throw new ActionRejected('forbidden', 'You can only claim for yourself');
      if (!(cl.amount > 0)) throw new ActionRejected('incomplete', 'Enter the claim amount');
      s.claims = [{ ...cl, status: 'submitted', createdAt: at, confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt }, ...s.claims];
      for (const sup of supervisorsOf(s, officerSite(s, cl.officerId))) s = notify(s, { officerId: sup, kind: 'hr', title: 'Claim to approve', body: `${name(s, cl.officerId)}: $${cl.amount.toFixed(2)} ${cl.type}`, at });
      s = audit(s, { at, kind: 'mozart_write', feature: 'hr.claim.submit', officerId: c.actorId, recordId: cl.id, confirmedAt: c.confirmedAt });
      break;
    }
    case 'claim.decide': {
      requireRole(s, c.actorId, ['supervisor', 'hq']);
      s.claims = upd(s.claims, c.claimId, (x) => {
        if (x.status !== 'submitted') throw new ActionRejected('bad_state', 'This claim was already decided');
        return { ...x, status: c.decision, approverId: c.actorId, decidedAt: at };
      });
      const cl = s.claims.find((x) => x.id === c.claimId)!;
      s = notify(s, { officerId: cl.officerId, kind: 'hr', title: `Claim ${c.decision}`, body: `$${cl.amount.toFixed(2)} ${cl.type}${c.decision === 'approved' ? ', paid with your next salary' : ''}`, at, link: '/v2/requests' });
      s = audit(s, { at, kind: 'mozart_write', feature: 'hr.claim.decide', officerId: c.actorId, recordId: c.claimId, confirmedAt: c.confirmedAt });
      break;
    }
    case 'swap.request': {
      const sw = c.swap;
      if (sw.officerId !== c.actorId) throw new ActionRejected('forbidden', 'You can only swap your own shift');
      s.shiftSwaps = [{ ...sw, status: 'pending', createdAt: at, confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt }, ...s.shiftSwaps];
      for (const sup of supervisorsOf(s, officerSite(s, sw.officerId))) s = notify(s, { officerId: sup, kind: 'hr', title: 'Shift swap to approve', body: `${name(s, sw.officerId)} ↔ ${name(s, sw.withOfficerId)} on ${sw.date}`, at });
      s = notify(s, { officerId: sw.withOfficerId, kind: 'hr', title: 'Shift swap request', body: `${name(s, sw.officerId)} asked to swap shifts with you on ${sw.date}`, at });
      break;
    }
    case 'swap.decide': {
      requireRole(s, c.actorId, ['supervisor', 'hq']);
      s.shiftSwaps = upd(s.shiftSwaps, c.swapId, (x) => ({ ...x, status: c.decision, approverId: c.actorId, decidedAt: at }));
      const sw = s.shiftSwaps.find((x) => x.id === c.swapId)!;
      if (c.decision === 'approved') {
        const a = s.roster.find((r) => r.officerId === sw.officerId && r.date === sw.date);
        const b = s.roster.find((r) => r.officerId === sw.withOfficerId && r.date === sw.date);
        s.roster = s.roster.map((r) => (r === a && b ? { ...r, shiftId: b.shiftId } : r === b && a ? { ...r, shiftId: a.shiftId } : r));
      }
      for (const o of [sw.officerId, sw.withOfficerId]) s = notify(s, { officerId: o, kind: 'hr', title: `Shift swap ${c.decision}`, body: `${sw.date}: ${name(s, sw.officerId)} ↔ ${name(s, sw.withOfficerId)}`, at });
      break;
    }
    case 'licence.renew': {
      s.licences = upd(s.licences, c.licenceId, (l) => {
        if (l.officerId !== c.actorId) throw new ActionRejected('forbidden', 'Not your licence');
        return { ...l, renewalRequestedAt: at };
      });
      const l = s.licences.find((x) => x.id === c.licenceId)!;
      s = notify(s, { officerId: c.actorId, kind: 'hr', title: 'Renewal requested', body: `HR will book your refresher training for ${l.name} and confirm the date in the app.`, at, link: '/v2/requests' });
      s = audit(s, { at, kind: 'mozart_write', feature: 'hr.licence.renew', officerId: c.actorId, recordId: l.id, confirmedAt: c.confirmedAt });
      break;
    }

    // ---------------- robots ----------------
    case 'robot.command': {
      const robot = s.robots.find((r) => r.id === c.robotId);
      if (!robot) throw new ActionRejected('not_found', `Robot ${c.robotId} not found`);
      const now = Date.parse(at);
      const cur = s.robotMissions.filter((m) => m.robotId === robot.id && (m.status === 'active' || m.status === 'paused')).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
      if (c.action === 'pause') {
        if (!cur || cur.status !== 'active') throw new ActionRejected('bad_state', `${robot.name} has no running mission`);
        s.robotMissions = upd(s.robotMissions, cur.id, (m) => ({ ...m, status: 'paused', pausedAt: at, pausedReason: 'Paused by operator' }));
      } else if (c.action === 'resume') {
        if (!cur || cur.status !== 'paused') throw new ActionRejected('bad_state', `${robot.name} is not paused`);
        s.robotMissions = upd(s.robotMissions, cur.id, (m) => ({ ...m, status: 'active', pausedMs: (m.pausedMs ?? 0) + Math.max(0, now - Date.parse(m.pausedAt ?? at)), pausedAt: undefined, pausedReason: undefined }));
      } else {
        const pose = robotPose(s, robot.id, now);
        if (cur) s.robotMissions = upd(s.robotMissions, cur.id, (m) => ({ ...m, status: 'aborted' }));
        const kind = c.action === 'return_dock' ? 'return' : c.action === 'patrol' ? 'patrol' : c.action === 'clean' ? 'clean' : 'goto';
        if (kind === 'patrol' && robot.kind !== 'patrol') throw new ActionRejected('bad_state', `${robot.name} is a cleaning robot`);
        if (kind === 'clean' && robot.kind !== 'cleaning') throw new ActionRejected('bad_state', `${robot.name} is a patrol robot`);
        const waypoints = kind === 'return' ? [robot.dockZoneId] : c.zoneIds ?? [];
        if (!waypoints.length) throw new ActionRejected('incomplete', 'Pick where the robot should go');
        s.robotMissions = [{
          id: c.missionId, robotId: robot.id, kind, waypoints, loop: kind === 'patrol' || kind === 'clean', startedAt: at, status: 'active', pausedMs: 0,
          from: { x: pose.x, y: pose.y }, createdBy: c.actorId, confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt,
        }, ...s.robotMissions];
      }
      s = audit(s, { at, kind: 'mozart_write', feature: `robot.${c.action}`, officerId: c.actorId, recordId: robot.id, confirmedAt: c.confirmedAt, detail: c.zoneIds?.join(',') });
      break;
    }
    case 'robot.event': {
      const e = c.event;
      s.robotEvents = [{ ...e, at, status: 'open' }, ...s.robotEvents.filter((x) => x.id !== e.id)];
      const robot = s.robots.find((r) => r.id === e.robotId);
      const cur = s.robotMissions.find((m) => m.robotId === e.robotId && m.status === 'active');
      if (cur && e.kind === 'detection' && robot?.kind === 'cleaning') {
        s.robotMissions = upd(s.robotMissions, cur.id, (m) => ({ ...m, status: 'paused', pausedAt: at, pausedReason: `Holding at ${e.label.toLowerCase()}` }));
      }
      if (cur && e.kind === 'low_battery') {
        s.robotMissions = upd(s.robotMissions, cur.id, (m) => ({ ...m, status: 'aborted' }));
        s.robotMissions = [{ id: `${e.id}-ret`, robotId: e.robotId, kind: 'return', waypoints: [robot!.dockZoneId], loop: false, startedAt: at, status: 'active', pausedMs: 0, createdBy: 'system' }, ...s.robotMissions];
      }
      const site = robot?.siteId ?? 'CNP';
      for (const sup of supervisorsOf(s, site)) s = notify(s, { officerId: sup, kind: 'robot', title: `${robot?.name ?? e.robotId}: ${e.label}`, body: e.detail, at, link: '/v2/control' });
      break;
    }
    case 'robot.task': {
      const e = s.robotEvents.find((x) => x.id === c.eventId);
      if (!e) throw new ActionRejected('not_found', `Event ${c.eventId} not found`);
      if (e.status !== 'open') throw new ActionRejected('bad_state', 'This event is already handled');
      const robot = s.robots.find((r) => r.id === e.robotId)!;
      const wo: WorkOrder = {
        id: c.recordId, type: 'corrective', category: e.suggestedSopId?.startsWith('SOP-HAZ') ? 'Hazard' : 'Security',
        title: `${e.label} (${robot.name})`, description: e.detail, status: 'assignment', priority: e.severity, siteId: robot.siteId, zoneId: e.zoneId,
        sopId: e.suggestedSopId, assigneeId: c.officerId,
        steps: [
          { id: 's1', label: `Go to the location (${robot.kind === 'cleaning' ? 'robot is holding position' : 'robot is watching'})`, done: false, notes: [], attachments: [] },
          { id: 's2', label: 'Make safe per SOP', done: false, notes: [], attachments: [] },
          { id: 's3', label: 'Close the job with a photo', done: false, notes: [], attachments: [] },
        ],
        attachments: e.imageUri ? [{ id: `att-${e.id}`, kind: 'fixtureImage', uri: e.imageUri, caption: `${robot.name} camera`, at: e.at }] : [],
        slaDue: new Date(Date.parse(at) + (e.severity === 'high' || e.severity === 'critical' ? 30 : 120) * 60_000).toISOString(),
        createdAt: at, source: 'robot', sourceRecordId: e.id, confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt,
      };
      s.workOrders = [wo, ...s.workOrders];
      s.robotEvents = upd(s.robotEvents, e.id, (x) => ({ ...x, status: 'tasked', workOrderId: wo.id, assigneeId: c.officerId }));
      s = notify(s, { officerId: c.officerId, kind: 'robot', title: `${robot.name} needs you`, body: `${e.label}: ${e.detail}`, at, link: `/v2/chat` });
      s = audit(s, { at, kind: 'mozart_write', feature: 'robot.task', officerId: c.actorId, recordId: wo.id, confirmedAt: c.confirmedAt });
      break;
    }
    case 'robot.dismiss': {
      s.robotEvents = upd(s.robotEvents, c.eventId, (x) => ({ ...x, status: 'dismissed' }));
      s = resumeRobotFor(s, c.eventId, Date.parse(at));
      break;
    }

    default: {
      const never: never = c;
      throw new ActionRejected('unknown', `Unknown command ${(never as Command).type}`);
    }
  }
  return s;
}

function requireRole(s: Draft, id: string, roles: string[]) {
  const o = s.officers.find((x) => x.id === id);
  if (!o || !roles.includes(o.role)) throw new ActionRejected('forbidden', 'Only a supervisor can decide this');
}

/** A robot that was holding position for an event goes back to work once the event is handled. */
function resumeRobotFor(s: Draft, eventId: string, now: number): Draft {
  const e = s.robotEvents.find((x) => x.id === eventId);
  if (!e) return s;
  return {
    ...s,
    robotMissions: s.robotMissions.map((m) => (m.robotId === e.robotId && m.status === 'paused' && m.pausedReason?.startsWith('Holding')
      ? { ...m, status: 'active', pausedMs: (m.pausedMs ?? 0) + Math.max(0, now - Date.parse(m.pausedAt ?? new Date(now).toISOString())), pausedAt: undefined, pausedReason: undefined }
      : m)),
  };
}

export function hasEvidence(w: WorkOrder): boolean {
  return w.attachments.length > 0 || w.steps.some((st) => st.verificationId || st.attachments.length > 0);
}

function addLogToTheme(t: Theme, logId: string, siteId: string, sentiment: number): Theme {
  if (t.logIds.includes(logId)) return t;
  const weeks = t.weeks.slice();
  const last = weeks[weeks.length - 1];
  weeks[weeks.length - 1] = { ...last, count: last.count + 1, sentiment: Math.round(((last.sentiment * last.count + sentiment) / (last.count + 1)) * 100) / 100 };
  const n = t.logIds.length;
  return {
    ...t,
    logIds: [...t.logIds, logId],
    siteIds: t.siteIds.includes(siteId) ? t.siteIds : [...t.siteIds, siteId],
    weeks,
    sentimentScore: Math.round(((t.sentimentScore * n + sentiment) / (n + 1)) * 100) / 100,
  };
}

function categoryFor(type?: string): string {
  switch (type) {
    case 'fire_panel': case 'fire_door': case 'meter': case 'pump': case 'extinguisher': case 'hose_reel': return 'Fire protection';
    case 'gate': case 'barrier': return 'Access systems';
    case 'cctv': case 'alarm': return 'Security systems';
    case 'lift': case 'escalator': return 'Vertical transport';
    case 'exit_sign': return 'Electrical';
    case 'aed': return 'Life safety';
    default: return 'General';
  }
}

/** Apply many commands, collecting rejections instead of throwing. */
export function applyAll(state: DemoState, cmds: Command[]): { state: DemoState; rejected: { key: string; code: string; message: string }[] } {
  let s = state;
  const rejected: { key: string; code: string; message: string }[] = [];
  for (const c of cmds) {
    try {
      s = apply(s, c);
    } catch (e) {
      const err = e as ActionRejected;
      rejected.push({ key: c.key, code: err.code ?? 'error', message: err.message });
    }
  }
  return { state: s, rejected };
}
