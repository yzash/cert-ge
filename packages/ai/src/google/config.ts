/** LIVE configuration, read from the BFF environment. Server-only. */
export interface GoogleConfig {
  project: string;
  geLocation: string;
  vertexLocation: string;
  engineId?: string;
  model: string;
  liteModel: string;
  wifAudience?: string;
  wifSubjectTokenType: string;
  devAccessToken?: string;
  modelArmorTemplate?: string;
}

export function readGoogleConfig(env: Record<string, string | undefined>): GoogleConfig | null {
  if (!env.GCP_PROJECT) return null;
  return {
    project: env.GCP_PROJECT,
    geLocation: env.GCP_LOCATION ?? 'global',
    vertexLocation: env.VERTEX_LOCATION ?? 'asia-southeast1',
    engineId: env.GE_ENGINE_ID,
    model: env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    liteModel: env.GEMINI_LITE_MODEL ?? 'gemini-2.5-flash-lite',
    wifAudience: env.WIF_AUDIENCE,
    wifSubjectTokenType: env.WIF_SUBJECT_TOKEN_TYPE ?? 'urn:ietf:params:oauth:token-type:id_token',
    devAccessToken: env.GOOGLE_ACCESS_TOKEN || undefined,
    modelArmorTemplate: env.MODEL_ARMOR_TEMPLATE || undefined,
  };
}
