import { applyAll, type Command } from '@mozart/actions';
import { seed, SCHEMA_VERSION } from '@mozart/fixtures';
import type { DemoState } from '@mozart/schema';
import { onSharedChange, shared } from './storage';

export interface PushResult {
  state: DemoState;
  rejected: { key: string; code: string; message: string }[];
}

/** Where commands are replayed (POST /sync). Local = this browser/device; BFF = shared server. */
export interface Server {
  kind: 'local' | 'bff';
  load(): Promise<DemoState>;
  push(cmds: Command[]): Promise<PushResult>;
  subscribe(cb: (s: DemoState) => void): () => void;
  reset(): Promise<DemoState>;
}

const KEY = `mozart.server.v${SCHEMA_VERSION}`;

export function createLocalServer(): Server {
  let mem: DemoState | null = null;
  const listeners = new Set<(s: DemoState) => void>();

  async function read(): Promise<DemoState> {
    const raw = await shared.get(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw) as DemoState;
        if (s.schemaVersion === SCHEMA_VERSION) return (mem = s);
      } catch {
        /* reseed */
      }
    }
    if (mem) return mem;
    mem = seed(Date.now());
    await shared.set(KEY, JSON.stringify(mem));
    return mem;
  }

  async function write(s: DemoState) {
    mem = s;
    const ok = await shared.set(KEY, JSON.stringify(s));
    if (!ok) {
      // Storage quota: drop inline photo data from old attachments and retry.
      const slim = JSON.parse(JSON.stringify(s), (k, v) => (k === 'uri' && typeof v === 'string' && v.startsWith('data:') && v.length > 2000 ? 'fixture://img-photo-placeholder' : v));
      await shared.set(KEY, JSON.stringify(slim));
    }
    listeners.forEach((l) => l(s));
  }

  return {
    kind: 'local',
    load: read,
    async push(cmds) {
      const cur = await read();
      const res = applyAll(cur, cmds);
      if (res.state !== cur) await write(res.state);
      return res;
    },
    subscribe(cb) {
      listeners.add(cb);
      const off = onSharedChange(KEY, (v) => {
        if (!v) return;
        try {
          mem = JSON.parse(v);
          cb(mem!);
        } catch {
          /* ignore */
        }
      });
      return () => {
        listeners.delete(cb);
        off();
      };
    },
    async reset() {
      const s = seed(Date.now());
      await write(s);
      return s;
    },
  };
}

/** The BFF holds one shared state for every device (multi-phone demos, LIVE mode). */
export function createBffServer(baseUrl: string, token?: string): Server {
  const base = baseUrl.replace(/\/$/, '') + '/api/v1';
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  return {
    kind: 'bff',
    async load() {
      const r = await fetch(`${base}/state`, { headers });
      if (!r.ok) throw new Error(`GET /state ${r.status}`);
      return r.json();
    },
    async push(cmds) {
      const r = await fetch(`${base}/sync`, { method: 'POST', headers, body: JSON.stringify({ commands: cmds }) });
      if (!r.ok) throw new Error(`POST /sync ${r.status}`);
      return r.json();
    },
    subscribe(cb) {
      let seq = -1;
      let alive = true;
      const tick = async () => {
        if (!alive) return;
        try {
          const r = await fetch(`${base}/state?since=${seq}`, { headers });
          if (r.status === 200) {
            const s = (await r.json()) as DemoState;
            seq = s.seq;
            cb(s);
          }
        } catch {
          /* offline: try again */
        }
        if (alive) setTimeout(tick, 2500);
      };
      setTimeout(tick, 2500);
      return () => {
        alive = false;
      };
    },
    async reset() {
      const r = await fetch(`${base}/reset`, { method: 'POST', headers });
      return r.json();
    },
  };
}
