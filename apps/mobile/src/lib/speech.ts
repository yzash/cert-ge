import { Platform } from 'react-native';

/**
 * Real speech-to-text on web (Chrome's Web Speech API) for unscripted input in DEMO mode.
 * In LIVE mode the app streams audio to Gemini Live through the BFF WebSocket proxy instead.
 */
type Rec = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void; onerror: (e: unknown) => void; start(): void; stop(): void;
};

export function speechSupported(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

const LANG: Record<string, string> = { en: 'en-SG', ms: 'ms-MY', zh: 'zh-CN', ta: 'ta-SG' };

export function startDictation(lang: string, onText: (t: string) => void, onEnd: () => void): () => void {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) {
    onEnd();
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = LANG[lang] ?? 'en-SG';
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    onText(text);
  };
  rec.onend = onEnd;
  rec.onerror = () => onEnd();
  try {
    rec.start();
  } catch {
    onEnd();
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };
}

/** Read an answer aloud (web speechSynthesis; Chrome, Edge, Safari on iOS/macOS, Android Chrome). */
export function ttsSupported(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, lang: string, onEnd?: () => void): () => void {
  if (!ttsSupported()) { onEnd?.(); return () => {}; }
  const synth = window.speechSynthesis;
  synth.cancel();
  const clean = text.replace(/\s?\[\d+\]/g, '').replace(/[*_#`]/g, '').trim();
  const u = new SpeechSynthesisUtterance(clean);
  const tag = LANG[lang] ?? lang;
  u.lang = tag;
  const voices = synth.getVoices();
  const voice = voices.find((v) => v.lang === tag) ?? voices.find((v) => v.lang.startsWith(tag.slice(0, 2)));
  if (voice) u.voice = voice;
  u.rate = 1.02;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
  return () => synth.cancel();
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
