import { exchangeForGoogleToken } from '@mozart/ai/src/google';
import { getState, google, readJson } from '@/lib/server';

/**
 * POST /auth/exchange: officer IdP token → session token (+ WIF access token cached server-side).
 * MVP: stub IdP. The session token has the same shape as the production one (JWT-like, sub = officer).
 */
export async function POST(req: Request) {
  const { officerId, idToken } = await readJson<{ officerId: string; idToken: string }>(req);
  const officer = getState().officers.find((o) => o.id === officerId);
  if (!officer) return Response.json({ error: 'unknown officer' }, { status: 401 });
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const accessToken = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: officer.id, role: officer.role, site: officer.siteId, exp, iss: 'stub-idp' })}.`;
  let wif: { status: string; expiresIn?: number } = { status: 'not configured' };
  if (google?.wifAudience && idToken && !idToken.startsWith('stub-idp.')) {
    try {
      const t = await exchangeForGoogleToken(google, officer.id, idToken);
      wif = { status: 'exchanged', expiresIn: t.expiresIn };
    } catch (e) {
      wif = { status: `failed: ${(e as Error).message}` };
    }
  }
  return Response.json({ accessToken, tokenType: 'Bearer', expiresIn: 12 * 3600, geSeat: officer.geSeatStatus, wif });
}
