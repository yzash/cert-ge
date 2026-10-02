import { clusterAgent } from '@mozart/ai/src/google';
import type { FrictionLog } from '@mozart/schema';
import { demo, getState, google, liveOrDemo, readJson } from '@/lib/server';

/** POST /hq/cluster: assign a forwarded friction log to a theme (Flash-Lite; nightly batch in production). */
export async function POST(req: Request) {
  const { log } = await readJson<{ log: FrictionLog }>(req);
  const themes = getState().themes;
  return liveOrDemo(req,
    (token) => clusterAgent(google!, token, log, themes),
    async () => { const { meta: _m, ...r } = await demo.clusterFriction(log, themes); return r; });
}
