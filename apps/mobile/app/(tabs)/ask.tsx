import { createDemoProvider, matchQa, normalize } from '@mozart/ai';
import { askVoiceClips, qaPairs, suggestedQuestions } from '@mozart/fixtures';
import type { Citation } from '@mozart/schema';
import { space, radius, touch } from '@mozart/ui';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { CitationChips, CitedText, TypingDots } from '@/components/answer';
import { Button, Chip, Icon, ModeBadge, Pill, Row, Screen, Txt } from '@/components/ui';
import { useMe, useOnline, useView } from '@/lib/hooks';
import { speechSupported, startDictation } from '@/lib/speech';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { getAi, useApp, type CachedAnswer } from '@/store/app';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations: Citation[];
  streaming?: boolean;
  grounded?: boolean;
  mode?: string;
  fallback?: boolean;
  cached?: boolean;
  firstTokenMs?: number;
  question?: string;
  escalated?: boolean;
  topic?: string;
}

const PRECACHE = ['qa-01', 'qa-04', 'qa-06', 'qa-32', 'qa-08'];

/** F2 Ask Mozart: grounded Q&A with citations; offline returns the last 20 cached answers. */
export default function Ask() {
  const c = useTheme();
  const t = useT();
  const s = useView();
  const me = useMe();
  const online = useOnline();
  const mode = useApp((x) => x.settings.aiMode);
  const lang = useApp((x) => x.settings.lang);
  const askCache = useApp((x) => x.askCache);
  const cacheAnswer = useApp((x) => x.cacheAnswer);
  const dispatch = useApp((x) => x.dispatch);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState<null | 'scripted' | (() => void)>(null);
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const ctx = { siteId: me.siteId, sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs };

  // The last sync caches the site's most-asked answers so Ask works at 0 bars.
  useEffect(() => {
    if (askCache.length) return;
    void (async () => {
      const demo = createDemoProvider({ pace: 0 });
      for (const id of PRECACHE) {
        const qa = qaPairs.find((q) => q.id === id)!;
        let text = '';
        const cits: Citation[] = [];
        for await (const ch of demo.ask({ question: qa.q, officerId: me.id, siteId: me.siteId, history: [], ctx })) {
          if (ch.type === 'text') text += ch.text;
          if (ch.type === 'citation') cits.push(ch.citation);
        }
        cacheAnswer({ q: qa.q, text, citations: cits, grounded: true, at: s.seededAt });
      }
    })();
  }, []);

  const scrollEnd = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 30);

  async function send(qRaw?: string) {
    const q = (qRaw ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    const uid = `u${Date.now()}`;
    const aid = `a${Date.now()}`;
    setMsgs((m) => [...m, { id: uid, role: 'user', text: q, citations: [] }, { id: aid, role: 'assistant', text: '', citations: [], streaming: true, question: q }]);
    scrollEnd();
    const patch = (p: Partial<Msg>) => setMsgs((m) => m.map((x) => (x.id === aid ? { ...x, ...p } : x)));

    if (!online) {
      const qa = matchQa(q);
      const hit = askCache.find((a) => normalize(a.q) === normalize(q) || (qa && matchQa(a.q)?.qa.id === qa.qa.id));
      if (hit) patch({ text: hit.text, citations: hit.citations, grounded: hit.grounded, streaming: false, cached: true, mode });
      else patch({ text: 'You’re offline and this question isn’t in your cached answers. It will work again when you reconnect.', grounded: false, streaming: false, cached: true });
      setBusy(false);
      scrollEnd();
      return;
    }

    const history = msgs.map((m) => ({ role: m.role, text: m.text, topic: m.topic, docIds: m.citations.map((x) => x.docId) }));
    let text = '';
    const cits: Citation[] = [];
    try {
      for await (const ch of getAi().ask({ question: q, officerId: me.id, siteId: me.siteId, history, ctx })) {
        if (ch.type === 'citation') { cits.push(ch.citation); patch({ citations: [...cits] }); }
        else if (ch.type === 'text') { text += ch.text; patch({ text }); }
        else {
          patch({ streaming: false, grounded: ch.grounded, mode: ch.fallback ? 'DEMO' : mode, fallback: ch.fallback, firstTokenMs: ch.firstTokenMs, topic: matchQa(q)?.qa.topic });
          if (ch.grounded) cacheAnswer({ q, text, citations: cits, grounded: true, at: new Date().toISOString() } satisfies CachedAnswer);
        }
        scrollEnd();
      }
    } catch (e) {
      patch({ streaming: false, grounded: false, text: `Ask Mozart is unavailable: ${(e as Error).message}` });
    }
    setBusy(false);
  }

  /** Scripted voice question: streams the transcript into the box as if spoken, then sends. */
  async function speakScripted(text: string) {
    setListening('scripted');
    let last = '';
    for await (const partial of getAi().transcribe(text, { durationSec: 4 })) { last = partial; setInput(partial); }
    setListening(null);
    await send(last);
  }

  function toggleMic() {
    if (listening && listening !== 'scripted') { listening(); setListening(null); return; }
    if (speechSupported()) {
      const stop = startDictation(lang, setInput, () => setListening(null));
      setListening(() => stop);
    } else void speakScripted(askVoiceClips[0].text);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen title="Ask Mozart" subtitle={`Grounded in ${s.sites.find((x) => x.id === me.siteId)?.short} SOPs, manuals, rules & notices`} scroll={false}
        right={<View style={{ paddingRight: 8 }}><ModeBadge mode={mode} /></View>}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {!online ? (
            <View style={{ padding: 10, borderRadius: 10, backgroundColor: c.attentionBg, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="cloud-offline-outline" color={c.attention} size={18} />
              <Txt v="small" color={c.attention} style={{ flex: 1, fontWeight: '600' }}>Offline · answering from {askCache.length} cached answers</Txt>
            </View>
          ) : null}
          {msgs.length === 0 ? (
            <View style={{ gap: space.md }}>
              <Txt v="small">Every answer cites the SOP, manual or notice it came from. No citation, no answer.</Txt>
              <Txt v="label">Try asking</Txt>
              {suggestedQuestions.map((q) => (
                <Pressable key={q} onPress={() => void send(q)} style={{ padding: space.md, minHeight: 44, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                  <Txt v="small" color={c.text}>{q}</Txt>
                </Pressable>
              ))}
              <Txt v="label">Ask by voice (demo clips)</Txt>
              <Row wrap>{askVoiceClips.map((v) => <Chip key={v.id} icon="mic-outline" label={v.label} onPress={() => void speakScripted(v.text)} />)}</Row>
            </View>
          ) : null}
          {msgs.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.accent, padding: space.md, borderRadius: 16, borderBottomRightRadius: 4 }}>
                <Txt color={c.accentText}>{m.text}</Txt>
              </View>
            ) : (
              <View key={m.id} style={{ alignSelf: 'stretch', backgroundColor: c.surface, padding: space.md, borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: m.grounded === false ? c.attention : c.border, gap: 10 }}>
                {m.text ? <CitedText text={m.text} citations={m.citations} /> : <TypingDots />}
                {!m.streaming && m.grounded ? <CitationChips citations={m.citations} /> : null}
                {!m.streaming && m.grounded === false && !m.cached ? (
                  m.escalated ? <Pill tone="pass" icon="checkmark" label="Sent to your supervisor" /> : (
                    <Button size="sm" kind="secondary" icon="arrow-up-circle-outline" label="Escalate to supervisor"
                      onPress={() => { dispatch({ type: 'ask.escalate', question: m.question ?? '', siteId: me.siteId }); setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, escalated: true } : y))); }} />
                  )
                ) : null}
                {!m.streaming ? (
                  <Row wrap>
                    {m.cached ? <Pill tone="attention" icon="cloud-offline-outline" label="Offline, cached" /> : <ModeBadge mode={m.mode} fallback={m.fallback} />}
                    {m.firstTokenMs !== undefined ? <Txt v="caption">first token {(m.firstTokenMs / 1000).toFixed(1)} s</Txt> : null}
                  </Row>
                ) : null}
              </View>
            ),
          )}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: space.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg }}>
          <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Ask by voice'} onPress={toggleMic}
            style={{ width: touch.large, height: touch.large, borderRadius: touch.large / 2, backgroundColor: listening ? c.fail : c.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: listening ? c.fail : c.primary }}>
            <Icon name={listening ? 'radio' : 'mic'} color={listening ? '#fff' : c.primary} size={26} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={listening ? 'Listening…' : t('askPlaceholder')}
            placeholderTextColor={c.textMuted}
            multiline
            onSubmitEditing={() => void send()}
            style={{ flex: 1, minHeight: touch.large, maxHeight: 120, borderRadius: radius.md, backgroundColor: c.surfaceAlt, color: c.text, paddingHorizontal: 12, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: c.border }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => void send()} disabled={!input.trim() || busy}
            style={{ width: touch.large, height: touch.large, borderRadius: touch.large / 2, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || busy ? 0.4 : 1 }}>
            <Icon name="send" color={c.primaryText} />
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
