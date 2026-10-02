import { commandRoute } from '@/lib/server';

/** POST /supervisor/instruction → `instruction.publish` command through the action layer (confirm-before-write enforced). */
export const POST = (req: Request) => commandRoute(req, 'instruction.publish');
