import { commandRoute } from '@/lib/server';

/** POST /reports/confirm → `report.confirm` command through the action layer (confirm-before-write enforced). */
export const POST = (req: Request) => commandRoute(req, 'report.confirm');
