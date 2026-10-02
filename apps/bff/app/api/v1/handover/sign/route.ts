import { commandRoute } from '@/lib/server';

/** POST /handover/sign → `handover.sign` command through the action layer (confirm-before-write enforced). */
export const POST = (req: Request) => commandRoute(req, 'handover.sign');
