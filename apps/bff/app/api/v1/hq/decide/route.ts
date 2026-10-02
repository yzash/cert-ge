import { commandRoute } from '@/lib/server';

/** POST /hq/decide → `hq.decide` command through the action layer (confirm-before-write enforced). */
export const POST = (req: Request) => commandRoute(req, 'hq.decide');
