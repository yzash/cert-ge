/** Model Armor screening for prompts (spoken reports, questions) and model responses. */
import type { GoogleConfig } from './config';

export interface ArmorVerdict { allowed: boolean; reason?: string }

async function sanitize(cfg: GoogleConfig, token: string, kind: 'sanitizeUserPrompt' | 'sanitizeModelResponse', text: string): Promise<ArmorVerdict> {
  if (!cfg.modelArmorTemplate) return { allowed: true };
  const loc = cfg.modelArmorTemplate.split('/locations/')[1]?.split('/')[0] ?? cfg.vertexLocation;
  const body = kind === 'sanitizeUserPrompt' ? { userPromptData: { text } } : { modelResponseData: { text } };
  const res = await fetch(`https://modelarmor.${loc}.rep.googleapis.com/v1/${cfg.modelArmorTemplate}:${kind}`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) return { allowed: true, reason: `armor unavailable (${res.status})` }; // fail open is a policy choice; see ADR-0003
  const j = (await res.json()) as { sanitizationResult?: { filterMatchState?: string } };
  const matched = j.sanitizationResult?.filterMatchState === 'MATCH_FOUND';
  return { allowed: !matched, reason: matched ? 'Blocked by Model Armor' : undefined };
}

export const screenPrompt = (cfg: GoogleConfig, token: string, text: string) => sanitize(cfg, token, 'sanitizeUserPrompt', text);
export const screenResponse = (cfg: GoogleConfig, token: string, text: string) => sanitize(cfg, token, 'sanitizeModelResponse', text);
