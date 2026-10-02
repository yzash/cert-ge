import { resetState } from '@/lib/server';

/** POST /reset: re-seed the synthetic world (demo only). */
export async function POST() {
  return Response.json(resetState());
}
