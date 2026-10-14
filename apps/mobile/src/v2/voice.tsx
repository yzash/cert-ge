/**
 * Voice mode (English / 中文), Gemini Live style: full-screen orb, live transcript, the answer is
 * read aloud. Real speech recognition where the browser has it (Chrome desktop + Android,
 * Safari on iOS 14.5+); everywhere else the same flow runs from pre-engineered demo prompts that
 * "speak" a scripted transcript. Either way the words go through the normal chat engine.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Officer } from '@mozart/schema';
import { v2 } from '@mozart/ui';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { speak, speechSupported, startDictation, stopSpeaking, ttsSupported } from '@/lib/speech';
import { useChat, type AgentId, type CardKind } from './chatStore';
import { sendMessage } from './engine';
import { useApp } from '@/store/app';
import { T, useV2 } from './ui';

export type VoiceLang = 'en' | 'zh';

export const VOICE_PROMPTS: Record<VoiceLang, string[]> = {
  en: [
    'Loading bay gate 4 is stuck half open, what do I do?',
    'There is an unattended bag at the atrium',
    'I am sick tomorrow, apply medical leave',
    'How much leave do I have left?',
    'Where are the robots?',
  ],
  zh: [
    '卸货区4号闸门卡住了怎么办？',
    '中庭有一个无人看管的包怎么办？',
    '我明天要请病假',
    '我的假期还剩多少？',
    '加班费怎么算？',
    '机器人在哪里？',
  ],
};

const CARD_SAY: Record<VoiceLang, Partial<Record<CardKind, string>> & { default: string }> = {
  en: {
    default: 'I’ve opened it in the chat. Check it and confirm there.',
    leave_apply: 'I’ve drafted the leave request. Nothing is sent until you confirm in the chat.',
    leave_balance: 'Here are your leave balances.',
    payslip: 'Your payslip is in the chat. Amounts stay hidden until you tap.',
    robots_status: 'Here is the robot fleet right now.',
    robot_command: 'Pick the robot and confirm the command in the chat.',
    report: 'I’ll draft the report. Check the fields in the chat, then submit.',
    photo_report: 'Take a photo and I’ll draft the incident report.',
  },
  zh: {
    default: '已经在聊天里打开了，请检查后确认。',
    leave_apply: '请假申请已经起草好了，你在聊天里确认后才会提交。',
    leave_balance: '这是你的假期余额。',
    payslip: '工资单在聊天里，点一下才会显示金额。',
    robots_status: '这是现在机器人的状态。',
    robot_command: '请在聊天里选择机器人并确认指令。',
    report: '我来起草报告，请在聊天里检查后提交。',
    photo_report: '请拍一张照片，我来起草事故报告。',
    tasks: '这是你的任务，最紧急的在最前面。',
    brief: '这是你今晚的班次简报。',
  },
};

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'card';

export function VoiceMode({ threadId, me, agent, initialLang = 'en', onClose }: { threadId: string; me: Officer; agent: AgentId; initialLang?: VoiceLang; onClose: () => void }) {
  const c = useV2();
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState<VoiceLang>(initialLang);
  const [phase, setPhase] = useState<Phase>('idle');
  const [wrongLang, setWrongLang] = useState(false);
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [simulated, setSimulated] = useState(false);
  const heardRef = useRef('');
  const stopRec = useRef<null | (() => void)>(null);
  const cancelled = useRef(false);
  const real = speechSupported();
  const pulse = useRef(new Animated.Value(0)).current;

  // the newest assistant message in this thread, for live streaming text
  const last = useChat((x) => x.threads.find((t) => t.id === threadId)?.messages.at(-1));

  useEffect(() => {
    const speed = phase === 'listening' ? 520 : phase === 'thinking' ? 380 : phase === 'speaking' ? 700 : 1800;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulse, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [phase]);
  useEffect(() => () => { cancelled.current = true; stopRec.current?.(); stopSpeaking(); }, []);

  async function submit(text: string) {
    const q = text.trim();
    if (!q) { setPhase('idle'); return; }
    setPhase('thinking');
    setReply('');
    await sendMessage(threadId, q, me, agent);
    if (cancelled.current) return;
    const m = useChat.getState().threads.find((t) => t.id === threadId)?.messages.at(-1);
    const say = m?.card ? (CARD_SAY[lang][m.card] ?? CARD_SAY[lang].default) : (m?.text ?? '');
    setReply(say);
    setPhase(m?.card ? 'card' : 'speaking');
    if (ttsSupported()) speak(say, lang, () => !cancelled.current && setPhase((p) => (p === 'speaking' ? 'idle' : p)));
    else if (!m?.card) setPhase('idle');
  }

  function listen() {
    stopSpeaking();
    if (phase === 'listening') { stopRec.current?.(); return; }
    if (!real) return;
    setSimulated(false);
    setHeard(''); heardRef.current = '';
    setReply('');
    setPhase('listening');
    setWrongLang(false);
    stopRec.current = startDictation(lang, (t) => { heardRef.current = t; setHeard(t); }, () => {
      stopRec.current = null;
      // the browser ignored zh-CN and transcribed in English (seen on iOS when Siri is set to English)
      if (lang === 'zh' && heardRef.current.trim() && !/[\u4e00-\u9fff]/.test(heardRef.current)) setWrongLang(true);
      if (!cancelled.current) void submit(heardRef.current);
    });
  }

  async function simulate(prompt: string) {
    stopSpeaking();
    stopRec.current?.();
    setSimulated(true);
    setReply('');
    setPhase('listening');
    // "speak" the prompt at talking pace: words for English, 2 characters at a time for Chinese
    const parts = lang === 'zh' ? prompt.match(/.{1,2}/gu) ?? [prompt] : prompt.split(/(?<=\s)/);
    let acc = '';
    for (const p of parts) {
      if (cancelled.current) return;
      acc += p;
      setHeard(acc);
      await new Promise((r) => setTimeout(r, lang === 'zh' ? 170 : 200));
    }
    await new Promise((r) => setTimeout(r, 350));
    await submit(acc);
  }

  const live = phase === 'thinking' && last?.role === 'assistant' && !last.card ? last.text ?? '' : reply;
  const status = {
    idle: real ? (lang === 'zh' ? '点一下圆球开始说话' : 'Tap the orb and speak') : (lang === 'zh' ? '选择一个示范问题' : 'Pick a demo prompt below'),
    listening: lang === 'zh' ? '正在听…' : 'Listening…',
    thinking: lang === 'zh' ? '正在查找现场文件…' : 'Checking the site documents…',
    speaking: lang === 'zh' ? '正在朗读' : 'Speaking',
    card: lang === 'zh' ? '请在聊天里确认' : 'Confirm in the chat',
  }[phase];
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: phase === 'idle' ? [1, 1.04] : [1, 1.16] });
  const halo = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, phase === 'idle' ? 0.3 : 0.5] });
  const bg = '#06182C';

  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: bg }}>
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, paddingHorizontal: 20, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        {/* top: language + close */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, padding: 4 }}>
            {(['en', 'zh'] as const).map((l) => (
              <Pressable key={l} accessibilityRole="button" accessibilityLabel={l === 'en' ? 'English' : 'Chinese'} accessibilityState={{ selected: lang === l }}
                onPress={() => { stopRec.current?.(); stopSpeaking(); setLang(l); useApp.getState().setSettings({ voiceLang: l }); setWrongLang(false); setPhase('idle'); setHeard(''); setReply(''); }}
                style={{ paddingHorizontal: 16, height: 36, borderRadius: 999, justifyContent: 'center', backgroundColor: lang === l ? '#fff' : 'transparent' }}>
                <Text style={{ fontFamily: v2.font.semibold, fontSize: 14, color: lang === l ? bg : 'rgba(255,255,255,0.8)' }}>{l === 'en' ? 'English' : '中文'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close voice mode" onPress={() => { cancelled.current = true; stopRec.current?.(); stopSpeaking(); onClose(); }}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* transcript + reply */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 20, gap: 18 }}>
          {heard ? <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 18, lineHeight: 27, fontFamily: v2.font.medium }}>“{heard}”</Text> : null}
          {live ? <Text style={{ color: '#fff', fontSize: 20, lineHeight: 31, fontFamily: v2.font.regular }}>{live.replace(/\s?\[\d+\]/g, '')}</Text> : null}
        </ScrollView>

        {/* orb */}
        <View style={{ alignItems: 'center', gap: 14, paddingVertical: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={phase === 'listening' ? 'Stop listening' : 'Start speaking'} onPress={listen} disabled={phase === 'thinking'}>
            <View style={{ width: 168, height: 168, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={{ position: 'absolute', width: 168, height: 168, borderRadius: 84, backgroundColor: phase === 'listening' ? c.orange : '#3D7CC4', opacity: halo, transform: [{ scale }] }} />
              <Animated.View style={{ position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: '#1E4B7A', opacity: 0.9, transform: [{ scale }] }} />
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: phase === 'listening' ? c.orange : '#F2F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={phase === 'listening' ? 'stop' : phase === 'thinking' ? 'ellipsis-horizontal' : phase === 'speaking' ? 'volume-high' : 'mic'} size={40} color={phase === 'listening' ? '#fff' : bg} />
              </View>
            </View>
          </Pressable>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: v2.font.semibold, fontSize: 15 }}>{status}</Text>
          {phase === 'card' || phase === 'speaking' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {phase === 'speaking' ? <Ghost label={lang === 'zh' ? '停止朗读' : 'Stop reading'} icon="stop-circle-outline" onPress={() => { stopSpeaking(); setPhase('idle'); }} /> : null}
              <Ghost label={lang === 'zh' ? '在聊天中查看' : 'Show in chat'} icon="chatbubble-ellipses-outline" onPress={() => { cancelled.current = true; stopSpeaking(); onClose(); }} />
            </View>
          ) : null}
        </View>

        {wrongLang ? (
          <View style={{ backgroundColor: 'rgba(245,130,32,0.16)', borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <Text style={{ color: '#fff', fontFamily: v2.font.semibold, fontSize: 14 }}>听到的是英文 · The browser returned English</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: v2.font.regular, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
              iPhone: Settings → Siri → Language → 普通话 (中国大陆), and add the Chinese keyboard; open in Safari. Android: use Chrome and add 中文 under Google → Voice. Or tap a demo prompt below.
            </Text>
          </View>
        ) : null}

        {/* demo prompts */}
        <View style={{ gap: 8, marginTop: 8 }}>
          <T v="caption" color="rgba(255,255,255,0.6)">
            {real
              ? (lang === 'zh' ? '语音识别已开启（普通话 zh-CN），也可以点下面的示范问题' : 'Live speech recognition is on (English, en-SG). Or tap a demo prompt')
              : (lang === 'zh' ? '此浏览器不支持语音识别，请使用下面的预设示范' : 'No speech recognition in this browser: use the pre-engineered demo prompts')}
            {simulated ? (lang === 'zh' ? '（当前为示范）' : ' (demo prompt in use)') : ''}
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {VOICE_PROMPTS[lang].map((p) => (
              <Pressable key={p} accessibilityRole="button" accessibilityLabel={`Say: ${p}`} disabled={phase === 'thinking' || phase === 'listening'} onPress={() => void simulate(p)}
                style={({ hovered }: { hovered?: boolean }) => ({ paddingHorizontal: 14, height: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: hovered ? 'rgba(255,255,255,0.1)' : 'transparent' })}>
                <Text style={{ color: '#fff', fontFamily: v2.font.medium, fontSize: 14 }}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function Ghost({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' }}>
      <Ionicons name={icon} size={16} color="#fff" />
      <Text style={{ color: '#fff', fontFamily: v2.font.semibold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}
