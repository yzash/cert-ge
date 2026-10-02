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
