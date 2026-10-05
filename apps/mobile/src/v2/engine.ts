/**
 * The chat engine: a message goes through the intent router (getAi().routeIntent), then either
 * streams a grounded answer or drops an interactive card into the thread. Cards never write on
 * their own: each one ends in an officer tap that dispatches a confirmed Command.
 */
import { matchQa, normalize, type Intent } from '@mozart/ai';
import type { Citation, Officer } from '@mozart/schema';
import { getAi, isOnline, useApp } from '@/store/app';
import { useChat, type AgentId, type CardKind } from './chatStore';

const CARD_FOR: Record<Exclude<Intent['kind'], 'ask'>, CardKind> = {
  brief: 'brief', tasks: 'tasks', report: 'report', verify: 'verify', handover: 'handover', friction: 'friction',
  leave_apply: 'leave_apply', leave_balance: 'leave_balance', payslip: 'payslip', claim: 'claim', swap: 'swap', roster: 'roster', licence: 'licence',
  robots_status: 'robots_status', robot_command: 'robot_command', approvals: 'approvals', team: 'team', alert: 'alert', themes: 'themes',
};

const LEAD: Partial<Record<CardKind, string>> = {
  brief: 'Here’s your shift at a glance.',
  tasks: 'Your open work orders, nearest SLA first.',
  report: 'I’ll draft the report. Check the fields, then submit.',
  verify: 'Point the camera at the equipment. I’ll compare it with the SOP’s expected state.',
  handover: 'I’ll draft your handover from tonight’s records.',
  friction: 'Tell HQ what doesn’t work. Two taps is enough.',
  leave_apply: 'I’ve drafted the leave request. Nothing is sent until you confirm.',
  leave_balance: 'Your leave balances.',
  payslip: 'Your latest payslip. Amounts stay hidden until you tap.',
  claim: 'I’ve started the claim. Add the receipt and submit.',
  swap: 'Pick who you’d like to swap with. Your supervisor approves.',
  roster: 'Your next two weeks.',
  licence: 'Your licences and certifications.',
  robots_status: 'The robot fleet right now.',
  robot_command: 'Confirm the robot command.',
  approvals: 'Waiting for your decision.',
  team: 'Your team tonight, blocked officers first.',
  alert: 'Choose the alert. It goes full-screen on every officer’s phone.',
  themes: 'Friction themes that need a decision.',
};

export async function sendMessage(threadId: string, text: string, me: Officer, agent: AgentId) {
  const chat = useChat.getState();
  const app = useApp.getState();
  const view = app.view!;
  chat.push(threadId, { role: 'user', text });

  const site = view.sites.find((s) => s.id === me.siteId) ?? view.sites[0];
  let intent: Intent = { kind: 'ask' };
  if (agent !== 'docs') {
    try {
      const r = await getAi().routeIntent(text, {
        role: me.role, now: Date.now(), officerId: me.id,
        zones: site.zones, robots: view.robots.map((r) => ({ id: r.id, kind: r.kind })),
      });
      intent = r.intent;
    } catch {
      intent = { kind: 'ask' };
    }
  }

  if (intent.kind !== 'ask') {
    const card = CARD_FOR[intent.kind];
    chat.push(threadId, { role: 'assistant', text: LEAD[card], card, data: { ...intent, utterance: text } });
    return;
  }
  await streamAnswer(threadId, text, me);
}

const PRECACHE_DONE = { v: false };

export async function streamAnswer(threadId: string, q: string, me: Officer) {
  const chat = useChat.getState();
  const app = useApp.getState();
  const view = app.view!;
  const id = chat.push(threadId, { role: 'assistant', text: '', streaming: true, citations: [], data: { q } });
  const patch = (p: Parameters<typeof chat.patch>[2]) => useChat.getState().patch(threadId, id, p);

  if (!isOnline()) {
    const qa = matchQa(q);
    const hit = app.askCache.find((a) => normalize(a.q) === normalize(q) || (qa && matchQa(a.q)?.qa.id === qa.qa.id));
    if (hit) patch({ text: hit.text, citations: hit.citations, grounded: hit.grounded, streaming: false, meta: { cached: true } });
    else patch({ text: 'You’re offline and this isn’t in your cached answers yet. It will work again when you reconnect.', grounded: false, streaming: false, meta: { cached: true } });
    return;
  }

  const thread = useChat.getState().threads.find((t) => t.id === threadId);
  const history = (thread?.messages ?? []).filter((m) => m.text).slice(-8).map((m) => ({ role: m.role, text: m.text ?? '', docIds: m.citations?.map((c) => c.docId) }));
  let text = '';
  const cits: Citation[] = [];
  try {
    for await (const ch of getAi().ask({
      question: q, officerId: me.id, siteId: me.siteId, history,
      ctx: { siteId: me.siteId, sites: view.sites, assets: view.assets, sops: view.sops, docs: view.docs },
    })) {
      if (ch.type === 'citation') { cits.push(ch.citation); patch({ citations: [...cits] }); }
      else if (ch.type === 'text') { text += ch.text; patch({ text }); }
      else {
        patch({ streaming: false, grounded: ch.grounded, meta: { mode: ch.fallback ? 'DEMO' : app.settings.aiMode, fallback: ch.fallback, firstTokenMs: ch.firstTokenMs, model: ch.model } });
        if (ch.grounded) app.cacheAnswer({ q, text, citations: cits, grounded: true, at: new Date().toISOString() });
      }
    }
  } catch (e) {
    patch({ streaming: false, grounded: false, text: `I couldn’t reach Mozart: ${(e as Error).message}` });
  }
}

/** Make sure a few common answers are cached for 0-bar use (the "last sync"). */
export async function precacheAnswers(me: Officer) {
  if (PRECACHE_DONE.v || useApp.getState().askCache.length) return;
  PRECACHE_DONE.v = true;
  const { createDemoProvider } = await import('@mozart/ai');
  const { qaPairs } = await import('@mozart/fixtures');
  const view = useApp.getState().view!;
  const demo = createDemoProvider({ pace: 0 });
  for (const id of ['qa-01', 'qa-04', 'qa-06', 'qa-32', 'qa-41']) {
    const qa = qaPairs.find((x) => x.id === id);
    if (!qa) continue;
    let text = '';
    const cits: Citation[] = [];
    for await (const ch of demo.ask({ question: qa.q, officerId: me.id, siteId: me.siteId, history: [], ctx: { siteId: me.siteId, sites: view.sites, assets: view.assets, sops: view.sops, docs: view.docs } })) {
      if (ch.type === 'text') text += ch.text;
      if (ch.type === 'citation') cits.push(ch.citation);
    }
    useApp.getState().cacheAnswer({ q: qa.q, text, citations: cits, grounded: true, at: view.seededAt });
  }
}

/** Notifications that deserve a card in the chat (the "push" lands in the conversation). */
export function surfaceNotifications(threadId: string, me: Officer) {
  const view = useApp.getState().view;
  const chat = useChat.getState();
  if (!view) return;
  const fresh = view.notifications.filter((n) => n.officerId === me.id && !chat.surfaced.includes(n.id) && Date.parse(n.at) > Date.parse(useApp.getState().session?.since ?? n.at) - 1);
  if (!fresh.length) return;
  chat.markSurfaced(fresh.map((n) => n.id));
  for (const n of fresh.slice(0, 3)) {
    if (n.kind === 'robot' && me.role === 'officer') {
      const ev = view.robotEvents.find((e) => e.assigneeId === me.id && e.status === 'tasked' && n.body.startsWith(e.label));
      chat.push(threadId, { role: 'assistant', card: 'robot_task', text: n.title, data: { eventId: ev?.id, workOrderId: ev?.workOrderId } });
    } else {
      chat.push(threadId, { role: 'assistant', card: 'notice', data: { title: n.title, body: n.body, kind: n.kind, link: n.link } });
    }
  }
}
