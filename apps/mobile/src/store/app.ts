/**
 * Device store: session, settings, offline outbox and the optimistic view.
 *
 *   view = applyAll(lastSyncedServerSnapshot, outbox)
 *
 * Every write is a Command with an idempotency key. Offline (airplane toggle or no network),
 * commands queue in the outbox and the UI shows "Pending sync"; on reconnect they replay in order.
 */
import { applyAll, apply, cmd, type Command, type CommandBody } from '@mozart/actions';
import { createAi, type AiProvider, type Mode } from '@mozart/ai';
import type { DemoState, Lang } from '@mozart/schema';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { device, IS_WEB } from './storage';
import { createBffServer, createLocalServer, type Server } from './transport';

export interface Settings {
  theme: 'dark' | 'light';
  lang: Lang;
  airplane: boolean;
  aiMode: Mode;
  backend: 'local' | 'bff';
  bffUrl: string;
  /** v2 (chat-first) appearance; light by default, dark for night shift */
  v2Theme: 'light' | 'dark';
}

export interface Session {
  officerId: string;
  remember: boolean;
  token?: string;
  since: string;
}

export interface Toast {
  id: string;
  kind: 'info' | 'success' | 'error' | 'push';
  title: string;
  body?: string;
  link?: string;
}

export interface CachedAnswer {
  q: string;
  text: string;
  citations: { n: number; docId: string; sectionId: string; title: string; section: string }[];
  grounded: boolean;
  at: string;
}

interface AppState {
  ready: boolean;
  session: Session | null;
  settings: Settings;
  server: DemoState | null;
  outbox: Command[];
  view: DemoState | null;
  lastSyncAt?: string;
  syncing: boolean;
  netOnline: boolean;
  toasts: Toast[];
  seenNotifs: string[];
  askCache: CachedAnswer[];
  init(): Promise<void>;
  signIn(officerId: string, remember: boolean): Promise<void>;
  signOut(): void;
  setSettings(p: Partial<Settings>): void;
  dispatch(body: CommandBody, opts?: { confirm?: boolean; quiet?: boolean }): { ok: true; key: string } | { ok: false; error: string };
  flush(): Promise<void>;
  reset(): Promise<void>;
  toast(t: Omit<Toast, 'id'>): void;
  dismissToast(id: string): void;
  cacheAnswer(a: CachedAnswer): void;
}

const DEVICE_KEY = 'mozart.device.v3';
const ENV_BFF = process.env.EXPO_PUBLIC_BFF_URL ?? '';

const defaultSettings: Settings = {
  theme: 'dark',
  lang: 'en',
  airplane: false,
  aiMode: 'DEMO',
  backend: 'local',
  bffUrl: ENV_BFF,
  v2Theme: 'light',
};

let server: Server = createLocalServer();
let unsub: (() => void) | null = null;
let aiCache: { key: string; ai: AiProvider } | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const useApp = create<AppState>((set, get) => {
  const online = () => get().netOnline && !get().settings.airplane;

  function recompute(srv: DemoState | null, outbox: Command[]) {
    if (!srv) return null;
    return outbox.length ? applyAll(srv, outbox).state : srv;
  }

  function persist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const { session, settings, outbox, server: snap, seenNotifs, askCache } = get();
      void device.set(DEVICE_KEY, JSON.stringify({ session: session?.remember || IS_WEB ? session : null, settings, outbox, server: snap, seenNotifs, askCache }));
    }, 150);
  }

  function onServerState(s: DemoState) {
    if (!online()) return; // offline devices do not see other devices' changes
    const view = recompute(s, get().outbox);
    set({ server: s, view, lastSyncAt: new Date().toISOString() });
    surfaceNotifications();
    persist();
  }

  function surfaceNotifications() {
    const { view, session, seenNotifs } = get();
    if (!view || !session) return;
    const fresh = view.notifications.filter((n) => n.officerId === session.officerId && !n.read && !seenNotifs.includes(n.id));
    if (!fresh.length) return;
    set({ seenNotifs: [...seenNotifs, ...fresh.map((n) => n.id)].slice(-500) });
    for (const n of fresh.slice(0, 3)) get().toast({ kind: 'push', title: n.title, body: n.body, link: n.link });
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function attachServer() {
    unsub?.();
    const st = get().settings;
    server = st.backend === 'bff' && st.bffUrl ? createBffServer(st.bffUrl, get().session?.token) : createLocalServer();
    unsub = server.subscribe(onServerState);
  }

  return {
    ready: false,
    session: null,
    settings: defaultSettings,
    server: null,
    outbox: [],
    view: null,
    syncing: false,
    netOnline: true,
    toasts: [],
    seenNotifs: [],
    askCache: [],

    async init() {
      if (get().ready) return;
      let saved: Partial<AppState> & { settings?: Settings } = {};
      try {
        const raw = await device.get(DEVICE_KEY);
        if (raw) saved = JSON.parse(raw);
      } catch {
        /* fresh device */
      }
      const settings = { ...defaultSettings, ...(saved.settings ?? {}) };
      if (!settings.bffUrl) settings.bffUrl = ENV_BFF;
      set({ settings, session: saved.session ?? null, outbox: saved.outbox ?? [], seenNotifs: saved.seenNotifs ?? [], askCache: saved.askCache ?? [] });

      if (IS_WEB) {
        set({ netOnline: navigator.onLine !== false });
        window.addEventListener('online', () => { set({ netOnline: true }); void get().flush(); });
        window.addEventListener('offline', () => set({ netOnline: false }));
      }
      attachServer();
      let srv: DemoState | null = (saved.server as DemoState | undefined) ?? null;
      if (online() || !srv) {
        try {
          srv = await server.load();
        } catch {
          if (settings.backend === 'bff') {
            // BFF unreachable: fall back to the on-device world so the demo never blanks.
            set({ settings: { ...settings, backend: 'local' } });
            attachServer();
            srv = await server.load();
          }
        }
      }
      const view = recompute(srv, get().outbox);
      // Notifications that exist before this device starts are not "pushed" again.
      const seen = get().seenNotifs.length ? get().seenNotifs : (view?.notifications.map((n) => n.id) ?? []);
      set({ server: srv, view, ready: true, seenNotifs: seen, lastSyncAt: online() ? new Date().toISOString() : undefined });
      persist();
      void get().flush();
      // Safety net: retry queued writes periodically (e.g. after a failed push).
      setInterval(() => void get().flush(), 5000);
    },

    async signIn(officerId, remember) {
      const st = get().settings;
      let token: string | undefined;
      if (st.bffUrl) {
        try {
          const r = await fetch(`${st.bffUrl.replace(/\/$/, '')}/api/v1/auth/exchange`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ officerId, idToken: `stub-idp.${officerId}` }),
          });
          if (r.ok) token = (await r.json()).accessToken;
        } catch {
          /* stub IdP unreachable: continue in DEMO */
        }
      }
      const officer = get().view?.officers.find((o) => o.id === officerId);
      const lang = officer?.languages.includes(st.lang) ? st.lang : 'en';
      set({
        session: { officerId, remember, token, since: new Date().toISOString() },
        settings: { ...st, lang },
        seenNotifs: (get().view?.notifications ?? []).map((n) => n.id),
      });
      aiCache = null;
      persist();
    },

    signOut() {
      set({ session: null });
      persist();
    },

    setSettings(p) {
      const prev = get().settings;
      const settings = { ...prev, ...p };
      set({ settings });
      aiCache = null;
      if (p.backend !== undefined || p.bffUrl !== undefined) {
        attachServer();
        void server.load().then((s) => {
          set({ server: s, view: recompute(s, get().outbox) });
          void get().flush();
        }).catch(() => get().toast({ kind: 'error', title: 'BFF unreachable', body: 'Staying on the on-device world.' }));
      }
      if (prev.airplane && !settings.airplane) {
        // Back online: pull what others changed, then replay our queue.
        void server.load().then((s) => {
          set({ server: s, view: recompute(s, get().outbox) });
          surfaceNotifications();
          void get().flush();
        });
      }
      persist();
    },

    dispatch(body, opts = {}) {
      const { session, view, outbox } = get();
      if (!session || !view) return { ok: false, error: 'Not signed in' };
      const c = cmd(session.officerId, body, { confirm: opts.confirm });
      try {
        // Validate locally first so the officer sees the same rules offline.
        apply(view, c);
      } catch (e) {
        const msg = (e as Error).message;
        if (!opts.quiet) get().toast({ kind: 'error', title: 'Not saved', body: msg });
        return { ok: false, error: msg };
      }
      const next = [...outbox, c];
      set({ outbox: next, view: recompute(get().server, next) });
      persist();
      void get().flush();
      return { ok: true, key: c.key };
    },

    async flush() {
      if (!online() || get().syncing || !get().outbox.length) return;
      set({ syncing: true });
      const batch = get().outbox;
      try {
        const res = await server.push(batch);
        const rest = get().outbox.filter((c) => !batch.some((b) => b.key === c.key));
        set({ server: res.state, outbox: rest, view: recompute(res.state, rest), lastSyncAt: new Date().toISOString() });
        for (const r of res.rejected) get().toast({ kind: 'error', title: 'Sync rejected', body: r.message });
        surfaceNotifications();
      } catch {
        /* stay queued */
      } finally {
        set({ syncing: false });
        persist();
        // Writes made while this batch was in flight go out next, in order.
        if (online() && get().outbox.some((c) => !batch.some((b) => b.key === c.key))) setTimeout(() => void get().flush(), 0);
      }
    },

    async reset() {
      const s = await server.reset();
      aiCache = null;
      set({ server: s, outbox: [], view: s, seenNotifs: s.notifications.map((n) => n.id), askCache: [], toasts: [] });
      persist();
    },

    toast(t) {
      const id = Math.random().toString(36).slice(2);
      set({ toasts: [...get().toasts.slice(-2), { ...t, id }] });
      setTimeout(() => get().dismissToast(id), t.kind === 'error' ? 6000 : 4500);
    },
    dismissToast(id) {
      set({ toasts: get().toasts.filter((x) => x.id !== id) });
    },
    cacheAnswer(a) {
      set({ askCache: [a, ...get().askCache.filter((x) => x.q !== a.q)].slice(0, 20) });
      persist();
    },
  };
});

/** The AI provider for the current mode. Screens never branch on DEMO vs LIVE. */
export function getAi(): AiProvider {
  const { settings, session } = useApp.getState();
  const key = `${settings.aiMode}|${settings.bffUrl}|${session?.token ?? ''}`;
  if (aiCache?.key === key) return aiCache.ai;
  const ai = createAi({
    mode: settings.aiMode,
    bffUrl: settings.bffUrl || undefined,
    token: session?.token,
    onAudit: (e) => {
      useApp.getState().dispatch({
        type: 'audit.ai',
        entry: {
          kind: e.ok ? 'ai_call' : 'ai_failure', feature: e.feature, officerId: e.officerId === '-' ? (session?.officerId ?? '-') : e.officerId,
          model: e.model, mode: e.mode, promptHash: e.promptHash, latencyMs: e.latencyMs, tokens: e.tokens, detail: e.detail,
        },
      }, { quiet: true });
    },
  });
  aiCache = { key, ai };
  return ai;
}

export const isOnline = () => {
  const s = useApp.getState();
  return s.netOnline && !s.settings.airplane;
};

/** Record ids whose creating command has not reached the server yet. */
export function pendingIds(outbox: Command[]): Set<string> {
  const ids = new Set<string>();
  for (const c of outbox) {
    if (c.type === 'report.confirm') ids.add(c.recordId);
    else if (c.type === 'friction.file') ids.add(c.log.id);
    else if (c.type === 'handover.sign') ids.add(c.handover.id);
    else if (c.type === 'verification.record') ids.add(c.verification.id);
    else if (c.type === 'briefing.ack') ids.add(c.itemId);
    else if (c.type === 'wo.requestClose' || c.type === 'wo.step' || c.type === 'wo.status') ids.add(c.woId);
  }
  return ids;
}
