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
};

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
