/**
 * Mozart action-layer client. The BFF calls this after a command has been applied and only for
 * commands that carry an officer confirmation. Idempotency-Key = command key, so replays after
 * reconnect never create duplicate work orders. The endpoint shapes are assumed (see PRD open
 * questions) and isolated here so they can be swapped for Mozart's real API in one place.
 */
import type { Command } from './commands';
import { CONFIRM_REQUIRED } from './commands';

export interface MozartWriteResult { ok: boolean; status: number; path?: string; skipped?: string }

const ROUTES: Partial<Record<Command['type'], (c: any) => { path: string; body: unknown }>> = {
  'report.confirm': (c) => ({ path: c.draft.type === 'corrective_wo' || c.draft.type === 'hazard' ? '/work-orders' : '/incidents', body: { externalId: c.recordId, draft: c.draft, attachments: c.attachments, reporterId: c.actorId } }),
  'wo.requestClose': (c) => ({ path: `/work-orders/${c.woId}/close-request`, body: { signature: c.signature } }),
  'closure.approve': (c) => ({ path: `/work-orders/${c.woId}/approve`, body: {} }),
  'closure.reject': (c) => ({ path: `/work-orders/${c.woId}/reject`, body: { reason: c.reason } }),
  'instruction.publish': (c) => ({ path: '/notices', body: { siteId: c.siteId, title: c.title, body: c.body, requiresAck: c.requiresAck } }),
  'briefing.ack': (c) => ({ path: `/notices/${c.itemId}/ack`, body: {} }),
  'hq.decide': (c) => ({ path: '/sop-decisions', body: { themeId: c.themeId, decision: c.decision, note: c.note, sopEdit: c.sopEdit } }),
  'handover.sign': (c) => ({ path: '/handovers', body: c.handover }),
  // Robotics fleet (Mozart robotics coordination; endpoint shapes assumed)
  'robot.command': (c) => ({ path: `/robots/${c.robotId}/commands`, body: { action: c.action, zoneIds: c.zoneIds, missionId: c.missionId } }),
  'robot.task': (c) => ({ path: '/work-orders', body: { externalId: c.recordId, fromRobotEvent: c.eventId, assigneeId: c.officerId } }),
};

/**
 * In-house HR system (leave, claims, roster, licences). Integration assumed: REST with the
 * officer's identity, idempotent POSTs. Only confirmed commands are sent.
 */
const HR_ROUTES: Partial<Record<Command['type'], (c: any) => { path: string; body: unknown }>> = {
  'leave.apply': (c) => ({ path: '/leave-requests', body: c.request }),
  'leave.decide': (c) => ({ path: `/leave-requests/${c.requestId}/decision`, body: { decision: c.decision, note: c.note } }),
  'claim.submit': (c) => ({ path: '/claims', body: c.claim }),
  'claim.decide': (c) => ({ path: `/claims/${c.claimId}/decision`, body: { decision: c.decision, note: c.note } }),
  'swap.request': (c) => ({ path: '/roster/swaps', body: c.swap }),
  'swap.decide': (c) => ({ path: `/roster/swaps/${c.swapId}/decision`, body: { decision: c.decision } }),
  'licence.renew': (c) => ({ path: `/licences/${c.licenceId}/renewal`, body: {} }),
};

export function createHrClient(baseUrl: string, apiKey?: string) {
  return {
    async write(c: Command): Promise<MozartWriteResult> {
      const route = HR_ROUTES[c.type];
      if (!route) return { ok: true, status: 0, skipped: 'not an HR record' };
      if (!c.confirmedBy || !c.confirmedAt) return { ok: false, status: 0, skipped: 'unconfirmed' };
      const { path, body } = route(c);
      const res = await fetch(baseUrl.replace(/\/$/, '') + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': c.key, 'x-acting-officer': c.actorId, ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify(body),
      });
      return { ok: res.ok, status: res.status, path };
    },
  };
}

export function createMozartClient(baseUrl: string, apiKey?: string) {
  return {
    async write(c: Command): Promise<MozartWriteResult> {
      const route = ROUTES[c.type];
      if (!route) return { ok: true, status: 0, skipped: 'not a Mozart record' };
      if (CONFIRM_REQUIRED.has(c.type) && (!c.confirmedBy || !c.confirmedAt)) return { ok: false, status: 0, skipped: 'unconfirmed' };
      const { path, body } = route(c);
      const res = await fetch(baseUrl.replace(/\/$/, '') + path, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': c.key,
          'x-confirmed-by': c.confirmedBy ?? '',
          'x-confirmed-at': c.confirmedAt ?? '',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      });
      return { ok: res.ok, status: res.status, path };
    },
  };
}
