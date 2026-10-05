/**
 * Chat threads for the v2 chat-first shell. Device-local (like the outbox), per officer.
 * A message is text (user or assistant) and/or a card: the card kind decides which
 * interactive component renders, `data` holds its inputs and whatever it has committed.
 */
import type { Citation } from '@mozart/schema';
import { create } from 'zustand';
import { device } from '@/store/storage';

export type CardKind =
  | 'answer' | 'brief' | 'tasks' | 'report' | 'verify' | 'handover' | 'friction'
  | 'leave_apply' | 'leave_balance' | 'payslip' | 'claim' | 'swap' | 'roster' | 'licence'
  | 'robots_status' | 'robot_command' | 'robot_task' | 'approvals' | 'team' | 'alert' | 'themes' | 'notice';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  card?: CardKind;
  data?: Record<string, unknown>;
  citations?: Citation[];
  streaming?: boolean;
  grounded?: boolean;
  meta?: { mode?: string; fallback?: boolean; cached?: boolean; firstTokenMs?: number; model?: string };
  at: string;
}

export interface Thread {
  id: string;
  officerId: string;
  title: string;
  agent: AgentId;
  messages: ChatMessage[];
  updatedAt: string;
}

export type AgentId = 'mozart' | 'docs' | 'reports' | 'hr' | 'robots';

export const AGENTS: { id: AgentId; name: string; blurb: string; icon: string }[] = [
  { id: 'mozart', name: 'Mozart', blurb: 'Everything: SOPs, reports, HR, robots', icon: 'sparkles' },
  { id: 'docs', name: 'Site knowledge', blurb: 'SOPs, manuals, notices, HR policy', icon: 'library' },
  { id: 'reports', name: 'Report & verify', blurb: 'Incidents, faults, camera checks', icon: 'mic' },
  { id: 'hr', name: 'HR & pay', blurb: 'Leave, payslips, claims, roster', icon: 'wallet' },
  { id: 'robots', name: 'Robots', blurb: 'Patrol and cleaning fleet', icon: 'hardware-chip' },
];

interface ChatState {
  loaded: boolean;
  threads: Thread[];
  currentId: string | null;
  surfaced: string[]; // notification ids already turned into chat cards
  load(): Promise<void>;
  current(officerId: string): Thread;
  newThread(officerId: string, agent?: AgentId): string;
  select(id: string): void;
  setAgent(id: string, agent: AgentId): void;
  push(threadId: string, m: Omit<ChatMessage, 'id' | 'at'> & { id?: string }): string;
  patch(threadId: string, messageId: string, p: Partial<ChatMessage>): void;
  patchData(threadId: string, messageId: string, d: Record<string, unknown>): void;
  markSurfaced(ids: string[]): void;
  remove(threadId: string): void;
}

const KEY = 'mozart.v2.chats';
let timer: ReturnType<typeof setTimeout> | null = null;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useChat = create<ChatState>((set, get) => {
  const persist = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const { threads, surfaced, currentId } = get();
      // never persist streaming state or large inline photos
      const slim = threads.slice(0, 20).map((t) => ({ ...t, messages: t.messages.slice(-60).map((m) => ({ ...m, streaming: false })) }));
      void device.set(KEY, JSON.stringify({ threads: slim, surfaced: surfaced.slice(-300), currentId }));
    }, 250);
  };
  const touch = (threadId: string, fn: (t: Thread) => Thread) => {
    set({ threads: get().threads.map((t) => (t.id === threadId ? { ...fn(t), updatedAt: new Date().toISOString() } : t)) });
    persist();
  };
  return {
    loaded: false,
    threads: [],
    currentId: null,
    surfaced: [],
    async load() {
      if (get().loaded) return;
      try {
        const raw = await device.get(KEY);
        if (raw) {
          const j = JSON.parse(raw);
          set({ threads: j.threads ?? [], surfaced: j.surfaced ?? [], currentId: j.currentId ?? null });
        }
      } catch {
        /* fresh device */
      }
      set({ loaded: true });
    },
    current(officerId) {
      const { threads, currentId } = get();
      const t = threads.find((x) => x.id === currentId && x.officerId === officerId) ?? threads.find((x) => x.officerId === officerId);
      if (t) return t;
      const id = get().newThread(officerId);
      return get().threads.find((x) => x.id === id)!;
    },
    newThread(officerId, agent = 'mozart') {
      const t: Thread = { id: `th-${uid()}`, officerId, title: 'New chat', agent, messages: [], updatedAt: new Date().toISOString() };
      set({ threads: [t, ...get().threads], currentId: t.id });
      persist();
      return t.id;
    },
    select(id) {
      set({ currentId: id });
      persist();
    },
    setAgent(id, agent) {
      touch(id, (t) => ({ ...t, agent }));
    },
    push(threadId, m) {
      const id = m.id ?? `m-${uid()}`;
      touch(threadId, (t) => ({
        ...t,
        title: t.title === 'New chat' && m.role === 'user' && m.text ? m.text.slice(0, 48) : t.title,
        messages: [...t.messages, { ...m, id, at: new Date().toISOString() }],
      }));
      return id;
    },
    patch(threadId, messageId, p) {
      touch(threadId, (t) => ({ ...t, messages: t.messages.map((m) => (m.id === messageId ? { ...m, ...p } : m)) }));
    },
    patchData(threadId, messageId, d) {
      touch(threadId, (t) => ({ ...t, messages: t.messages.map((m) => (m.id === messageId ? { ...m, data: { ...(m.data ?? {}), ...d } } : m)) }));
    },
    markSurfaced(ids) {
      set({ surfaced: [...get().surfaced, ...ids] });
      persist();
    },
    remove(threadId) {
      const threads = get().threads.filter((t) => t.id !== threadId);
      set({ threads, currentId: get().currentId === threadId ? threads[0]?.id ?? null : get().currentId });
      persist();
    },
  };
});
