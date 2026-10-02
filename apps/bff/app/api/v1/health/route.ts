import { getState, google } from '@/lib/server';

/** GET /health: which LIVE integrations are configured. */
export async function GET() {
  const s = getState();
  return Response.json({
    ok: true,
    seq: s.seq,
    live: {
      geminiEnterprise: !!(google?.engineId),
      geap: !!google,
      wif: !!google?.wifAudience,
      modelArmor: !!google?.modelArmorTemplate,
      mozartActions: !!process.env.MOZART_API_URL,
    },
  });
}
