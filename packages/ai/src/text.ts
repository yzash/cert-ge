import type { Lang } from '@mozart/schema';

const STOP = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'what', 'do', 'i', 'if', 'to', 'of', 'on', 'in', 'at', 'for', 'and', 'or', 'my', 'me', 'it', 'there', 'this', 'that',
  'should', 'can', 'how', 'when', 'where', 'which', 'with', 'be', 'does', 'did', 'we', 'you', 'our', 'your', 'from', 'by', 'about', 'any', 'shows', 'show', 's', 'sop',
]);

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[‘’']/g, '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function tokens(s: string): string[] {
  return normalize(s).split(' ').filter((w) => w && !STOP.has(w));
}

export function detectLang(s: string): Lang {
  if (/[一-鿿]/.test(s)) return 'zh';
  if (/[஀-௿]/.test(s)) return 'ta';
  const ms = ['apa', 'saya', 'perlu', 'buat', 'pintu', 'pagar', 'tersangkut', 'kebakaran', 'boleh', 'bagaimana', 'di', 'ada', 'tidak', 'sudah', 'lantai', 'dekat'];
  const t = normalize(s).split(' ');
  const hits = t.filter((w) => ms.includes(w)).length;
  return hits >= 2 ? 'ms' : 'en';
}

/** Key match: works for space-separated scripts and for CJK/Tamil (substring). */
export function keyScore(text: string, keys: string[]): number {
  const n = ` ${normalize(text)} `;
  let hit = 0;
  for (const k of keys) {
    const kk = normalize(k);
    if (/[一-鿿஀-௿]/.test(kk) ? n.includes(kk) : n.includes(` ${kk} `) || n.includes(` ${kk}s `) || (kk.length > 5 && n.includes(kk))) hit++;
  }
  return hit;
}

/** FNV-1a 32-bit, hex. Used as a prompt hash in the audit log (we never log raw prompts). */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
