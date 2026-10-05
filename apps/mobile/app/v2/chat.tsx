import Ionicons from '@expo/vector-icons/Ionicons';
import { approvalsFor, fleetSummary, rankTasks } from '@mozart/actions';
import { v2 } from '@mozart/ui';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { slaText } from '@/lib/format';
import { useMe, useNow, useOnline, useView } from '@/lib/hooks';
import { speechSupported, startDictation } from '@/lib/speech';
import { useApp } from '@/store/app';
import { CardFor } from '@/v2/cards';
import { AnswerBody } from '@/v2/cards/core';
import { AGENTS, useChat, type AgentId, type ChatMessage } from '@/v2/chatStore';
import { precacheAnswers, sendMessage, surfaceNotifications } from '@/v2/engine';
import { useShell, useWide } from '@/v2/shell';
import { Avatar, Badge, FadeIn, GradientText, IconBtn, Row, T, useV2 } from '@/v2/ui';

const SUGGEST: Record<string, { label: string; text: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[]> = {
  officer: [
    { label: 'Brief me on my shift', text: 'Brief me on my shift', icon: 'sunny-outline' },
    { label: 'Supervisory fault on L3?', text: 'What is the SOP if the fire panel shows a supervisory fault on L3?', icon: 'library-outline' },
    { label: 'Report a jammed gate', text: 'Report a jammed gate at B2', icon: 'mic-outline' },
    { label: 'Apply for leave', text: 'Apply annual leave next friday for 2 days', icon: 'calendar-outline' },
    { label: 'My payslip', text: 'Show my payslip', icon: 'wallet-outline' },
    { label: 'Send a robot to patrol L5', text: 'Send a robot to patrol the canopy park', icon: 'hardware-chip-outline' },
  ],
  supervisor: [
    { label: 'What needs my approval?', text: 'What is waiting for me to approve?', icon: 'checkmark-done-outline' },
    { label: 'Who is blocked?', text: 'Who is blocked on my team?', icon: 'people-outline' },
    { label: 'Where are the robots?', text: 'Where are the robots?', icon: 'map-outline' },
    { label: 'Clean the dining terrace', text: 'Get a cleaning robot to scrub the dining terrace', icon: 'water-outline' },
    { label: 'Send a drill alert', text: 'Send an evacuation drill alert', icon: 'warning-outline' },
    { label: 'Leave policy', text: 'How many days of annual leave do I get?', icon: 'library-outline' },
  ],
  hq: [
    { label: 'Themes needing a decision', text: 'Which friction themes need a decision?', icon: 'analytics-outline' },
    { label: 'Robot fleet now', text: 'Where are the robots?', icon: 'hardware-chip-outline' },
    { label: 'Gate SOP step 4', text: 'Loading bay gate 4 is stuck half open, what do I do?', icon: 'library-outline' },
    { label: 'Overtime rules', text: 'How is my overtime calculated?', icon: 'wallet-outline' },
  ],
};

export default function Chat() {
  const c = useV2();
  const me = useMe();
  const s = useView();
  const now = useNow();
  const wide = useWide();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const mode = useApp((x) => x.settings.aiMode);
  const lang = useApp((x) => x.settings.lang);
  const setDrawer = useShell((x) => x.setDrawer);
  const threads = useChat((x) => x.threads);
  const currentId = useChat((x) => x.currentId);
  const newThread = useChat((x) => x.newThread);
  const setAgent = useChat((x) => x.setAgent);
  const thread = threads.find((t) => t.id === currentId && t.officerId === me.id) ?? threads.find((t) => t.officerId === me.id);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [agentMenu, setAgentMenu] = useState(false);
  const [listening, setListening] = useState<null | (() => void)>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => { if (!thread) newThread(me.id); }, [me.id, !!thread]);
  useEffect(() => { void precacheAnswers(me); }, [me.id]);
  useEffect(() => { if (thread) surfaceNotifications(thread.id, me); }, [s.notifications.length, thread?.id]);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60); }, [thread?.messages.length]);

  if (!thread) return null;
  const agent = AGENTS.find((a) => a.id === thread.agent) ?? AGENTS[0];
  const empty = thread.messages.length === 0;

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    await sendMessage(thread.id, q, me, thread.agent);
    setBusy(false);
  };
  const mic = () => {
    if (listening) { listening(); setListening(null); return; }
    if (speechSupported()) setListening(() => startDictation(lang, setInput, () => setListening(null)));
    else void send('Report something by voice');
  };

  const composer = (
    <View style={{ width: '100%', maxWidth: v2.chatWidth, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, padding: 8, paddingLeft: 10, borderRadius: v2.radius.xl, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...(Platform.OS === 'web' ? { boxShadow: `0 4px 24px ${c.shadow}` } : {}) } as never}>
        <IconBtn icon="add" label="Report, verify or hand over" onPress={() => void send('Report something')} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={listening ? 'Listening…' : `Ask ${agent.name} anything, or tell it what to do`}
          placeholderTextColor={c.textFaint}
          multiline
          onKeyPress={(e) => {
            const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) { (e as unknown as { preventDefault(): void }).preventDefault(); void send(); }
          }}
          accessibilityLabel="Message"
          style={{ flex: 1, minHeight: 44, maxHeight: 160, paddingVertical: 11, fontSize: 16, fontFamily: v2.font.regular, color: c.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) } as never}
        />
        <IconBtn icon={listening ? 'stop-circle' : 'mic-outline'} color={listening ? c.fail : c.textMuted} label={listening ? 'Stop dictation' : 'Speak'} onPress={mic} />
        <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={() => void send()} disabled={!input.trim() || busy}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: input.trim() ? c.orange : c.sunken, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-up" size={22} color={input.trim() ? c.onOrange : c.textFaint} />
        </Pressable>
      </View>
      <T v="caption" color={c.textFaint} style={{ textAlign: 'center', marginTop: 8 }}>
        {online ? 'Answers cite site documents. Actions only happen when you confirm.' : 'Offline · answers from cache, actions queue and sync later'}
      </T>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {/* top bar */}
      <Row style={{ paddingTop: insets.top + 8, paddingHorizontal: wide ? 20 : 8, paddingBottom: 6, justifyContent: 'space-between' }}>
        <Row gap={4}>
          {!wide ? <IconBtn icon="menu" label="Open navigation" onPress={() => setDrawer(true)} /> : null}
          <Pressable onPress={() => setAgentMenu(!agentMenu)} accessibilityRole="button" accessibilityLabel="Choose assistant"
            style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 40, borderRadius: 999, backgroundColor: hovered || agentMenu ? c.sunken : 'transparent' })}>
            <Text style={{ fontFamily: v2.font.semibold, fontSize: 17, color: c.text }}>{agent.name}</Text>
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </Pressable>
        </Row>
        <Row gap={6}>
          {!online ? <Badge tone="warn" icon="cloud-offline-outline" label="Offline" /> : null}
          <Badge tone={mode === 'LIVE' ? 'pass' : 'neutral'} label={mode === 'LIVE' ? 'LIVE' : 'DEMO'} />
          {!wide ? <Avatar initials={me.initials} size={30} /> : null}
        </Row>
      </Row>
      {agentMenu ? (
        <FadeIn style={{ position: 'absolute', top: insets.top + 56, left: wide ? 20 : 52, zIndex: 20, width: 300, backgroundColor: c.raised, borderRadius: 18, padding: 8, borderWidth: 1, borderColor: c.border, ...(Platform.OS === 'web' ? { boxShadow: `0 12px 40px ${c.shadow}` } : {}) } as never}>
          {AGENTS.map((a) => (
            <Pressable key={a.id} onPress={() => { setAgent(thread.id, a.id as AgentId); setAgentMenu(false); }}
              style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: 'row', gap: 12, padding: 10, borderRadius: 12, alignItems: 'center', backgroundColor: a.id === agent.id ? c.navySoft : hovered ? c.sunken : 'transparent' })}>
              <Ionicons name={a.icon as never} size={18} color={a.id === agent.id ? c.navy : c.textMuted} />
              <View style={{ flex: 1 }}><T v="smallStrong">{a.name}</T><T v="caption">{a.blurb}</T></View>
              {a.id === agent.id ? <Ionicons name="checkmark" size={18} color={c.navy} /> : null}
            </Pressable>
          ))}
        </FadeIn>
      ) : null}

      {empty ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ width: '100%', maxWidth: v2.chatWidth, alignSelf: 'center', gap: 22 }}>
            <FadeIn style={{ gap: 6 }}>
              <GradientText size={wide ? 44 : 34}>Hello, {me.name.split(' ')[0]}</GradientText>
              <T v="lead" color={c.textFaint}>{greetingLine(me.role, s, me.id, now)}</T>
            </FadeIn>
            <FadeIn delay={80}>{composer}</FadeIn>
            <FadeIn delay={140}>
              <Row wrap gap={8} style={{ justifyContent: 'center' }}>
                {(SUGGEST[me.role] ?? SUGGEST.officer).map((x) => (
                  <Pressable key={x.label} onPress={() => void send(x.text)} accessibilityRole="button"
                    style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 40, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: hovered ? c.sunken : c.surface })}>
                    <Ionicons name={x.icon} size={16} color={c.textMuted} />
                    <Text style={{ fontFamily: v2.font.medium, fontSize: 14, color: c.text }}>{x.label}</Text>
                  </Pressable>
                ))}
              </Row>
            </FadeIn>
            <FadeIn delay={200}><Glance onPick={(t) => void send(t)} /></FadeIn>
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ width: '100%', maxWidth: v2.chatWidth, alignSelf: 'center', gap: 22 }}>
              {thread.messages.map((m) => <Message key={m.id} threadId={thread.id} m={m} />)}
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 12, paddingTop: 4 }}>{composer}</View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function greetingLine(role: string, s: ReturnType<typeof useView>, id: string, now: number): string {
  if (role === 'hq') return 'Four sites, one view. What do you want to look at?';
  if (role === 'supervisor') {
    const a = approvalsFor(s, id);
    const n = a.closures.length + a.leave.length + a.claims.length + a.swaps.length;
    return `${n} item${n === 1 ? '' : 's'} waiting for you tonight. How can I help?`;
  }
  const next = rankTasks(s, id, now)[0];
  return next ? `Night shift at Canopy Mall. Next up: ${next.wo.title.split(':')[0]} (${slaText(next.minutesToSla).replace('SLA ', '')}).` : 'Night shift at Canopy Mall. How can I help?';
}

/** "At a glance" tiles under the greeting. Tapping one asks for the matching card. */
function Glance({ onPick }: { onPick: (text: string) => void }) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const tiles: { label: string; value: string; text: string; tone?: string }[] = [];
  if (me.role === 'officer') {
    const toAck = s.briefingItems.filter((b) => b.siteId === me.siteId && b.requiresAck && !b.ackByOfficerId[me.id]).length;
    tiles.push({ label: 'Briefing', value: toAck ? `${toAck} to acknowledge` : 'All done', text: 'Brief me on my shift', tone: toAck ? c.orange : undefined });
    tiles.push({ label: 'Tasks', value: `${rankTasks(s, me.id).length} open`, text: 'What are my tasks?' });
    tiles.push({ label: 'Leave', value: `${(s.leaveBalances.find((b) => b.officerId === me.id && b.type === 'annual')?.entitled ?? 0) - (s.leaveBalances.find((b) => b.officerId === me.id && b.type === 'annual')?.taken ?? 0)} days left`, text: 'How much leave do I have left?' });
  } else {
    const a = approvalsFor(s, me.role === 'hq' ? 'o-meiling' : me.id);
    const f = fleetSummary(s, 'CNP');
    if (me.role === 'supervisor') tiles.push({ label: 'Approvals', value: `${a.closures.length + a.leave.length + a.claims.length + a.swaps.length} waiting`, text: 'What is waiting for me to approve?', tone: c.orange });
    tiles.push({ label: 'Robots', value: `${f.working} working · ${f.openEvents} events`, text: 'Where are the robots?' });
    if (me.role === 'hq') tiles.push({ label: 'Themes', value: `${s.themes.filter((t) => !t.decision).length} need a decision`, text: 'Which friction themes need a decision?', tone: c.orange });
  }
  return (
    <Row gap={10} wrap>
      {tiles.map((t) => (
        <Pressable key={t.label} onPress={() => onPick(t.text)} accessibilityRole="button"
          style={({ hovered }: { hovered?: boolean }) => ({ flexGrow: 1, flexBasis: 150, padding: 14, borderRadius: 18, backgroundColor: hovered ? c.sunken : c.surface, borderWidth: 1, borderColor: c.border, gap: 2 })}>
          <T v="caption">{t.label}</T>
          <T v="smallStrong" color={t.tone ?? c.text}>{t.value}</T>
        </Pressable>
      ))}
    </Row>
  );
}

function Message({ threadId, m }: { threadId: string; m: ChatMessage }) {
  const c = useV2();
  if (m.role === 'user') {
    return (
      <FadeIn style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
        <View style={{ backgroundColor: c.mode === 'dark' ? c.raised : '#E9EEF5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderBottomRightRadius: 6 }}>
          <T color={c.text}>{m.text}</T>
        </View>
      </FadeIn>
    );
  }
  const isAnswer = !m.card;
  return (
    <FadeIn style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.navySoft, marginTop: 2 }}>
        <Ionicons name="sparkles" size={16} color={c.orange} />
      </View>
      <View style={{ flex: 1, gap: 10, minWidth: 0 }}>
        {isAnswer ? <AnswerBody msg={m} /> : (
          <>
            {m.text && m.card !== 'robot_task' ? <T color={c.text}>{m.text}</T> : null}
            <CardFor threadId={threadId} msg={m} />
          </>
        )}
      </View>
    </FadeIn>
  );
}

