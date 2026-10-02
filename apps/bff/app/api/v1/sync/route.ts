import type { Command } from '@mozart/actions';
import { applyCommands, readJson } from '@/lib/server';

/** POST /sync: replay the device's offline queue in order; idempotency keys make retries safe. */
export async function POST(req: Request) {
  const { commands } = await readJson<{ commands: Command[] }>(req);
  if (!Array.isArray(commands)) return Response.json({ error: 'commands[] required' }, { status: 400 });
  const res = await applyCommands(commands);
  return Response.json({ state: res.state, rejected: res.rejected, mozartWrites: res.mozartWrites });
}
