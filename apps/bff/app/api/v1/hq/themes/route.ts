import { kpis } from '@mozart/actions';
import { getState } from '@/lib/server';

/** GET /hq/themes: clustered themes (BigQuery in production) with their logs and KPIs. */
export async function GET() {
  const s = getState();
  return Response.json({
    kpis: kpis(s),
    themes: s.themes.map((t) => ({ ...t, logs: s.frictionLogs.filter((f) => t.logIds.includes(f.id)) })),
    publishedUpdates: s.briefingItems.filter((b) => b.type === 'policyUpdate'),
  });
}
