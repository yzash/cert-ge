import { commandRoute } from '@/lib/server';

/** POST /friction → `friction.file` (body: { log }). */
export const POST = (req: Request) => commandRoute(req, 'friction.file');
