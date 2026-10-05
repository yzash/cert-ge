/**
 * Chat intent router: one sentence → which card the chat should show, with slots filled.
 * DEMO = deterministic rules below; LIVE = GEAP router agent (Gemini, JSON schema) via the BFF.
 * Policy questions ("how many days of leave do I get?") route to grounded Ask, personal data
 * ("how much leave do I have left?") to the HR card, actions ("apply leave on Friday") to a draft.
 */
import { z } from 'zod';
import { normalize } from './text';

export const LeaveTypeIntent = z.enum(['annual', 'medical', 'childcare', 'compassionate', 'unpaid']);

export const Intent = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ask') }),
  z.object({ kind: z.literal('brief') }),
  z.object({ kind: z.literal('tasks') }),
  z.object({ kind: z.literal('report'), clipId: z.string().optional() }),
  z.object({ kind: z.literal('verify'), assetId: z.string().optional() }),
  z.object({ kind: z.literal('handover') }),
  z.object({ kind: z.literal('friction') }),
  z.object({ kind: z.literal('leave_apply'), type: LeaveTypeIntent, from: z.string().nullable(), to: z.string().nullable(), reason: z.string().optional() }),
  z.object({ kind: z.literal('leave_balance') }),
  z.object({ kind: z.literal('payslip') }),
  z.object({ kind: z.literal('claim'), type: z.enum(['transport', 'meal', 'medical', 'uniform', 'training']).nullable(), amount: z.number().nullable() }),
  z.object({ kind: z.literal('swap'), date: z.string().nullable() }),
  z.object({ kind: z.literal('roster') }),
  z.object({ kind: z.literal('licence') }),
  z.object({ kind: z.literal('robots_status') }),
  z.object({ kind: z.literal('robot_command'), action: z.enum(['patrol', 'clean', 'goto', 'pause', 'resume', 'return_dock']), robotId: z.string().nullable(), robotKind: z.enum(['patrol', 'cleaning']).nullable(), zoneId: z.string().nullable() }),
  z.object({ kind: z.literal('approvals') }),
  z.object({ kind: z.literal('team') }),
  z.object({ kind: z.literal('alert') }),
  z.object({ kind: z.literal('themes') }),
]);
export type Intent = z.infer<typeof Intent>;
export type IntentKind = Intent['kind'];

export interface RouteContext {
  role: 'officer' | 'supervisor' | 'hq';
  now: number;
  zones: { id: string; name: string; level: string }[];
  robots: { id: string; kind: 'patrol' | 'cleaning' }[];
}

const has = (t: string, ...words: string[]) => words.some((w) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(t));
const hasAny = (t: string, re: RegExp) => re.test(t);

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Dates in a sentence: "tomorrow", "next friday", "12 oct", "12 and 13 oct", "12-14 october", "for 2 days from monday". */
export function parseDates(text: string, now: number): { from: string | null; to: string | null } {
  const t = normalize(text);
  const base = new Date(now);
  base.setUTCHours(0, 0, 0, 0);
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
  let from: Date | null = null;
  let to: Date | null = null;

  // 12-14 oct | 12 to 14 october | 12 and 13 oct | 12 oct
  const range = /(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|to|and|until|till)\s*(\d{1,2})(?:st|nd|rd|th)?\s*([a-z]{3,9})/.exec(t);
  const single = /(\d{1,2})(?:st|nd|rd|th)?\s*([a-z]{3,9})/.exec(t);
  const monthOf = (w: string) => MONTHS.indexOf(w.slice(0, 3));
  const mk = (day: number, month: number) => {
    let d = new Date(Date.UTC(base.getUTCFullYear(), month, day));
    if (d.getTime() < base.getTime() - 7 * 86_400_000) d = new Date(Date.UTC(base.getUTCFullYear() + 1, month, day));
    return d;
  };
  if (range && monthOf(range[3]) >= 0) {
    from = mk(Number(range[1]), monthOf(range[3]));
    to = mk(Number(range[2]), monthOf(range[3]));
  } else if (single && monthOf(single[2]) >= 0) {
    from = to = mk(Number(single[1]), monthOf(single[2]));
  } else if (has(t, 'today', 'tonight')) {
    from = to = base;
  } else if (has(t, 'tomorrow')) {
    from = to = addDays(base, 1);
  } else {
    const dow = DOW.findIndex((d) => t.includes(d) || t.includes(d.slice(0, 3) + ' '));
    if (dow >= 0) {
      let diff = (dow - base.getUTCDay() + 7) % 7 || 7;
      if (t.includes('next week')) diff += 7;
      from = to = addDays(base, diff);
    }
  }
  const forDays = /(?:for\s+)?(\d{1,2}|two|three|four|five)\s+days?/.exec(t);
  if (from && forDays) {
    const n = ({ two: 2, three: 3, four: 4, five: 5 } as Record<string, number>)[forDays[1]] ?? Number(forDays[1]);
    if (n > 1 && n < 30) to = addDays(from, n - 1);
  }
  return { from: from ? ymd(from) : null, to: to ? ymd(to) : null };
}

function zoneIn(t: string, zones: RouteContext['zones']) {
  let best: { id: string; score: number } | null = null;
  for (const z of zones) {
    const words = normalize(z.name).split(' ').filter((w) => w.length > 3 && !['retail'].includes(w));
    let score = words.filter((w) => t.includes(w)).length;
    if (t.includes(` ${normalize(z.level)} `) || t.includes(` level ${normalize(z.level).replace(/\D/g, '')} `)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { id: z.id, score };
  }
  return best?.id ?? null;
}

/** Deterministic DEMO router. */
export function routeIntentDemo(text: string, ctx: RouteContext): Intent {
  const t = ` ${normalize(text)} `;
  const question = /^\s*(how|what|when|why|which|can|should|is|are|do|does|where)\b/.test(normalize(text)) || text.trim().endsWith('?');

  // robots
  const robotId = /\b(pr|cr)\s*-?\s*0?(\d)\b/.exec(t);
  const rid = robotId ? `${robotId[1].toUpperCase()}-0${robotId[2]}` : null;
  if (has(t, 'robot', 'robots', 'scrubber', 'cleaner', 'bot', 'bots') || rid) {
    const zoneId = zoneIn(t, ctx.zones);
    if (hasAny(t, /\b(pause|stop|hold)\b/)) return { kind: 'robot_command', action: 'pause', robotId: rid, robotKind: null, zoneId };
    if (hasAny(t, /\b(resume|continue|restart)\b/)) return { kind: 'robot_command', action: 'resume', robotId: rid, robotKind: null, zoneId };
    if (hasAny(t, /\b(return|dock|charge|go home)\b/)) return { kind: 'robot_command', action: 'return_dock', robotId: rid, robotKind: null, zoneId };
    if (hasAny(t, /\b(clean|scrub|mop|wash)\b/)) return { kind: 'robot_command', action: 'clean', robotId: rid, robotKind: 'cleaning', zoneId };
    if (hasAny(t, /\b(patrol|watch|guard|cover)\b/)) return { kind: 'robot_command', action: 'patrol', robotId: rid, robotKind: 'patrol', zoneId };
    if (hasAny(t, /\b(send|dispatch|go to|move)\b/)) return { kind: 'robot_command', action: 'goto', robotId: rid, robotKind: null, zoneId };
    return { kind: 'robots_status' };
  }

  // corporate services
  if (has(t, 'payslip', 'payroll', 'salary', 'pay') && !question) return { kind: 'payslip' };
  if (hasAny(t, /\b(my|last|latest|this months|september|august|july)\b.*\b(payslip|pay|salary|overtime|ot)\b/) && !hasAny(t, /\bhow is\b|\bcalculated\b|\bwhen is\b/)) return { kind: 'payslip' };
  if (hasAny(t, /\b(leave balance|leave left|days left|how much leave|how many days (do i have|left))\b/)) return { kind: 'leave_balance' };
  if (hasAny(t, /\b(apply|take|book|request|need|want)\b.*\b(leave|off|mc|day off)\b/) || hasAny(t, /\b(im sick|i am sick|on mc|sick leave)\b/) && !hasAny(t, /\bwhat do i do\b/)) {
    const type = hasAny(t, /\b(sick|mc|medical|unwell)\b/) ? 'medical' : has(t, 'childcare') ? 'childcare' : has(t, 'compassionate', 'funeral', 'bereavement') ? 'compassionate' : has(t, 'unpaid') ? 'unpaid' : 'annual';
    const { from, to } = parseDates(text, ctx.now);
    return { kind: 'leave_apply', type, from, to };
  }
  if (hasAny(t, /\b(claim|reimburse|reimbursement|expense)\b/) && !question) {
    const type = hasAny(t, /\b(taxi|grab|transport|cab|ride)\b/) ? 'transport' : hasAny(t, /\b(meal|food|dinner|supper)\b/) ? 'meal' : hasAny(t, /\b(clinic|doctor|medical)\b/) ? 'medical' : hasAny(t, /\b(uniform|shoes|boots)\b/) ? 'uniform' : null;
    const amt = /\$\s?(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s?(?:dollars|sgd)/.exec(text);
    return { kind: 'claim', type, amount: amt ? Number(amt[1] ?? amt[2]) : null };
  }
  if (hasAny(t, /\b(swap|switch|exchange)\b.*\b(shift|night|duty)\b|\bshift swap\b/)) return { kind: 'swap', date: parseDates(text, ctx.now).from };
  if (hasAny(t, /\b(roster|my shifts|next shift|schedule|when am i working|when do i work)\b/)) return { kind: 'roster' };
  if (hasAny(t, /\b(licence|license|certification|certificate|cert)\b/) && !hasAny(t, /\bwhen should\b|\bhow\b/)) return { kind: 'licence' };

  // supervisor / hq
  if (ctx.role !== 'officer' && hasAny(t, /\b(approve|approvals|pending|waiting for me|to approve|my queue)\b/)) return { kind: 'approvals' };
  if (ctx.role !== 'officer' && hasAny(t, /\b(team|shift board|who is blocked|blocked|my officers|where is everyone)\b/)) return { kind: 'team' };
  if (ctx.role !== 'officer' && hasAny(t, /\b(alert|broadcast|evacuat|lockdown|bolo)\b/) && !question) return { kind: 'alert' };
  if (ctx.role === 'hq' && hasAny(t, /\b(theme|themes|friction|feedback|decision|decide|sop change)\b/)) return { kind: 'themes' };

  // frontline flows
  if (hasAny(t, /\b(hand ?over|handover|end of shift|end my shift)\b/) && !question) return { kind: 'handover' };
  if (hasAny(t, /\b(verify|check this|camera|is this (ok|normal|correct)|scan the panel)\b/)) return { kind: 'verify' };
  if (hasAny(t, /\b(doesnt work|does not work|dont work|flag a problem|friction|this sop is wrong|complain|feedback)\b/)) return { kind: 'friction' };
  if (hasAny(t, /\b(report|log an incident|raise a work order|raise wo|incident report)\b/) && !question) {
    const clip = hasAny(t, /\bgate\b/) ? 'clip-gate' : hasAny(t, /\b(leak|dripping)\b/) ? 'clip-leak' : undefined;
    return { kind: 'report', clipId: clip };
  }
  if (!question && hasAny(t, /\b(jam\w*|stuck|broken|leak\w*|spill\w*|drip\w*|collapsed|injured|trapped|not working)\b/)) return { kind: 'report' };
  if (hasAny(t, /\b(my tasks|what now|what should i do now|next task|my work orders|todo)\b/)) return { kind: 'tasks' };
  if (hasAny(t, /\b(brief|briefing|my shift|start my shift|good (morning|evening)|hello|hi)\b/) && t.trim().split(' ').length <= 6) return { kind: 'brief' };
  return { kind: 'ask' };
}
