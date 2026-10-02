/**
 * Workforce Identity Federation: exchange the officer's IdP token for a Google access token
 * via STS, so GE licensing and data-store ACLs apply per officer (never a shared service account).
 * Tokens are cached per officer until shortly before expiry (Memorystore in production).
 */
import type { GoogleConfig } from './config';

const cache = new Map<string, { token: string; exp: number }>();

export async function exchangeForGoogleToken(cfg: GoogleConfig, officerId: string, idpToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const hit = cache.get(officerId);
  if (hit && hit.exp > Date.now() + 60_000) return { accessToken: hit.token, expiresIn: Math.round((hit.exp - Date.now()) / 1000) };
  if (!cfg.wifAudience) throw new Error('WIF_AUDIENCE not configured');
  const res = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience: cfg.wifAudience,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      subjectToken: idpToken,
      subjectTokenType: cfg.wifSubjectTokenType,
    }),
  });
  if (!res.ok) throw new Error(`STS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cache.set(officerId, { token: j.access_token, exp: Date.now() + j.expires_in * 1000 });
  return { accessToken: j.access_token, expiresIn: j.expires_in };
}

export function cachedToken(officerId: string): string | undefined {
  const hit = cache.get(officerId);
  return hit && hit.exp > Date.now() ? hit.token : undefined;
}
