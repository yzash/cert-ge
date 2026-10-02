/** Minimal Vertex AI Gemini client for GEAP agents: JSON-schema output, then Zod validation. */
import type { z } from 'zod';
import type { GoogleConfig } from './config';

export interface GeminiCall {
  model: string;
  system: string;
  prompt: string;
  image?: { mimeType: string; data: string };
  responseSchema: Record<string, unknown>;
}

export async function generateJson<T>(cfg: GoogleConfig, token: string, call: GeminiCall, schema: z.ZodType<T>): Promise<{ data: T; tokens: number; latencyMs: number }> {
  const t0 = Date.now();
  const url = `https://${cfg.vertexLocation}-aiplatform.googleapis.com/v1/projects/${cfg.project}/locations/${cfg.vertexLocation}/publishers/google/models/${call.model}:generateContent`;
  const parts: Record<string, unknown>[] = [{ text: call.prompt }];
  if (call.image) parts.push({ inlineData: call.image });
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: call.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: call.responseSchema },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: { totalTokenCount?: number } };
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned non-JSON output');
  }
  const v = schema.safeParse(parsed);
  if (!v.success) throw new Error(`Gemini output failed validation: ${v.error.issues[0]?.path.join('.')} ${v.error.issues[0]?.message}`);
  return { data: v.data, tokens: j.usageMetadata?.totalTokenCount ?? 0, latencyMs: Date.now() - t0 };
}
