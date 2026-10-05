/**
 * BFF core: one shared Mozart world for every device (in-memory, optionally persisted to disk),
 * the same reducer the app runs offline, and the LIVE / DEMO switch for AI endpoints.
 */
import { applyAll, createHrClient, createMozartClient, CONFIRM_REQUIRED, type Command } from '@mozart/actions';
import { createDemoProvider, type SiteContext } from '@mozart/ai';
import { readGoogleConfig, cachedToken, type GoogleConfig } from '@mozart/ai/src/google';
import { seed } from '@mozart/fixtures';
import type { DemoState } from '@mozart/schema';
import fs from 'node:fs';
import path from 'node:path';

const g = globalThis as unknown as { __mozart?: { state: DemoState } };
const DATA = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'state.json') : null;

export function getState(): DemoState {
  if (!g.__mozart) {
    let state: DemoState | null = null;
    if (DATA && fs.existsSync(DATA)) {
      try { state = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch { state = null; }
    }
    g.__mozart = { state: state ?? seed(Date.now()) };
  }
  return g.__mozart.state;
}

export function setState(s: DemoState) {
  getState();
  g.__mozart!.state = s;
  if (DATA) {
    fs.mkdirSync(path.dirname(DATA), { recursive: true });
    fs.writeFileSync(DATA, JSON.stringify(s));
  }
}

export function resetState(): DemoState {
  const s = seed(Date.now());
  setState(s);
  return s;
}

const mozart = process.env.MOZART_API_URL ? createMozartClient(process.env.MOZART_API_URL, process.env.MOZART_API_KEY) : null;
const hr = process.env.HR_API_URL ? createHrClient(process.env.HR_API_URL, process.env.HR_API_KEY) : null;

/** POST /sync: replay commands in order (idempotent by key), then write confirmed ones to Mozart. */
export async function applyCommands(cmds: Command[]) {
  const before = getState();
  const res = applyAll(before, cmds);
  setState(res.state);
  const writes: { key: string; status: number; path?: string }[] = [];
  if (mozart || hr) {
    for (const c of cmds) {
      if (!CONFIRM_REQUIRED.has(c.type) || res.rejected.some((r) => r.key === c.key) || before.processedKeys.includes(c.key)) continue;
      try {
        const target = c.type.startsWith('leave.') || c.type.startsWith('claim.') || c.type.startsWith('swap.') || c.type.startsWith('licence.') ? hr : mozart;
        if (!target) continue;
        const w = await target.write(c);
        writes.push({ key: c.key, status: w.status, path: w.path });
      } catch (e) {
        writes.push({ key: c.key, status: -1, path: String(e) });
      }
    }
  }
  return { ...res, mozartWrites: writes };
}

export const google: GoogleConfig | null = readGoogleConfig(process.env);
export const demo = createDemoProvider({ pace: 0.6 });

export function ctxFor(siteId = 'CNP'): SiteContext {
  const s = getState();
  return { siteId, sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs };
}

/** Stub IdP token: base64url JSON { officerId, exp }. Production: a signed JWT from the Certis IdP. */
export function officerFrom(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1] ?? '', 'base64url').toString());
    return payload.exp > Date.now() / 1000 ? payload.sub : null;
  } catch {
    return null;
  }
}

export function googleTokenFor(req: Request): string | undefined {
  const officer = officerFrom(req);
  return (officer && cachedToken(officer)) || google?.devAccessToken;
}

export const wantsLive = (req: Request) => req.headers.get('x-mozart-mode') === 'LIVE';

export function fallback(reason: string) {
  return Response.json({ fallback: true, reason });
}

/**
 * LIVE when configured; if LIVE was requested but is not available, tell the client to fall back
 * (it shows the DEMO answer with a badge). DEMO-mode callers get the scripted provider server-side.
 */
export async function liveOrDemo<T>(req: Request, live: (token: string) => Promise<T>, demoFn: () => Promise<T>): Promise<Response> {
  const token = googleTokenFor(req);
  if (wantsLive(req)) {
    if (!google || !token) return fallback('LIVE backend not configured on this BFF');
    try {
      return Response.json(await live(token));
    } catch (e) {
      return fallback((e as Error).message);
    }
  }
  return Response.json(await demoFn());
}

export async function readJson<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

/**
 * Typed convenience endpoints (/reports/confirm, /handover/sign, ...) wrap one command.
 * The confirmation fields must come from the device (the officer's tap); the server never fills them.
 */
export async function commandRoute(req: Request, type: Command['type']) {
  const body = await readJson<Record<string, unknown> & { actorId?: string; confirmedBy?: string; confirmedAt?: string }>(req);
  const actorId = officerFrom(req) ?? body.actorId;
  if (!actorId) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const key = req.headers.get('idempotency-key') ?? `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const c = { ...body, type, key, actorId, at: new Date().toISOString() } as unknown as Command;
  const res = await applyCommands([c]);
  if (res.rejected.length) return Response.json({ error: res.rejected[0].message, code: res.rejected[0].code }, { status: 422 });
  return Response.json({ ok: true, key, seq: res.state.seq, mozartWrites: res.mozartWrites });
}
