import { commandRoute } from '@/lib/server';

/** POST /handover/ack → `handover.ack` command through the action layer (confirm-before-write enforced). */
export const POST = (req: Request) => commandRoute(req, 'handover.ack');
