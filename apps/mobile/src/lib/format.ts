import type { DemoState } from '@mozart/schema';

export function clock(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ago(iso: string, now = Date.now()): string {
  const m = Math.round((now - Date.parse(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 14 ? `${d} d ago` : `${Math.round(d / 7)} wk ago`;
}

export function slaText(mins: number): string {
  if (mins < 0) return `SLA breached ${Math.abs(mins)} min`;
  if (mins < 60) return `SLA in ${mins} min`;
  const h = Math.floor(mins / 60);
  return `SLA in ${h} h ${mins % 60} min`;
}

export function zoneName(s: DemoState, siteId: string, zoneId?: string | null): string {
  return s.sites.find((x) => x.id === siteId)?.zones.find((z) => z.id === zoneId)?.name ?? zoneId ?? '';
}

export function officerName(s: DemoState, id?: string): string {
  return s.officers.find((o) => o.id === id)?.name ?? id ?? '';
}

export function assetName(s: DemoState, id?: string | null): string {
  return s.assets.find((a) => a.id === id)?.name ?? '';
}

export function sopLabel(s: DemoState, id?: string | null): string {
  const sop = s.sops.find((x) => x.id === id);
  return sop ? `${sop.code} ${sop.title}` : '';
}

export const STATUS_LABEL: Record<string, string> = {
  assignment: 'Assignment', acknowledged: 'Acknowledgement', in_progress: 'In Progress', on_hold: 'On Hold', pending_approval: 'Pending Approval', closed: 'Closed',
  received: 'Received', under_review: 'Under review', decided: 'Decided',
  open: 'Open', investigating: 'Investigating', resolved: 'Resolved',
};

/** Night shift start (19:00 of the seeded demo evening); used for handover scope. */
export function shiftStart(s: DemoState): string {
  return new Date(Date.parse(s.seededAt) - 4 * 3600_000).toISOString();
}
