import { approvalsFor, missedCheckpoints, newId, rankTasks, shiftBoard } from '@mozart/actions';
import type { Citation, EmergencyAlert } from '@mozart/schema';
import { v2 } from '@mozart/ui';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SceneImage } from '@/components/media';
import { ago, clock, officerName, slaText, zoneName } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { getAi, useApp } from '@/store/app';
import type { ChatMessage } from '../chatStore';
import { usePanel } from '../panels';
import { Badge, Btn, Col, Divider, Icon, Row, Surface, T, useV2 } from '../ui';

export interface CardProps { threadId: string; msg: ChatMessage }

/** Streaming grounded answer: inline [n] markers + source chips that open the document panel. */
export function AnswerBody({ msg }: { msg: ChatMessage }) {
  const c = useV2();
  const open = usePanel((x) => x.open);
  const cits = msg.citations ?? [];
  const parts = (msg.text ?? '').split(/(\[\d+\])/g);
  return (
    <Col gap={12}>
      {msg.text ? (
        <Text style={{ color: c.text, fontSize: 16, lineHeight: 26, fontFamily: v2.font.regular }}>
          {parts.map((p, i) => {
            const m = /^\[(\d+)\]$/.exec(p);
            if (!m) return <Text key={i}>{p}</Text>;
            const cit = cits.find((x) => x.n === Number(m[1]));
            return (
              <Text key={i} accessibilityRole="link" onPress={() => cit && open({ kind: 'doc', id: cit.docId, section: cit.sectionId })}
                style={{ color: c.orange, fontFamily: v2.font.semibold, fontSize: 12 }}>{` ${m[1]} `}</Text>
            );
          })}
        </Text>
      ) : <TypingDots />}
      {!msg.streaming && cits.length ? <Sources cits={cits} /> : null}
      {!msg.streaming ? (
        <Row wrap>
          {msg.meta?.cached ? <Badge tone="warn" icon="cloud-offline-outline" label="Offline, cached" /> : msg.meta?.fallback ? <Badge tone="warn" icon="warning-outline" label="LIVE failed · DEMO answer" /> : null}
          {msg.grounded === false && !msg.meta?.cached ? <EscalateButton question={msg.data?.q as string | undefined} /> : null}
          {msg.meta?.firstTokenMs !== undefined ? <T v="caption" color={c.textFaint}>{(msg.meta.firstTokenMs / 1000).toFixed(1)} s to first word</T> : null}
        </Row>
      ) : null}
    </Col>
  );
}

function Sources({ cits }: { cits: Citation[] }) {
  const c = useV2();
  const open = usePanel((x) => x.open);
  return (
    <Row wrap gap={6}>
      {cits.map((cit) => (
        <Pressable key={cit.n} accessibilityRole="link" onPress={() => open({ kind: 'doc', id: cit.docId, section: cit.sectionId })}
          style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderRadius: 999, backgroundColor: hovered ? c.sunken : c.surface, borderWidth: 1, borderColor: c.border, maxWidth: 300 })}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.navySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.navy, fontSize: 11, fontFamily: v2.font.bold }}>{cit.n}</Text>
          </View>
          <T v="caption" color={c.text} numberOfLines={1} style={{ flexShrink: 1 }}>{cit.title.replace(/^SOP-[A-Z]+-\d+ /, '')} · {cit.section}</T>
        </Pressable>
      ))}
    </Row>
  );
}

function EscalateButton({ question }: { question?: string }) {
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const [done, setDone] = useState(false);
  return done ? <Badge tone="pass" icon="checkmark" label="Sent to your supervisor" /> : (
    <Btn size="sm" kind="soft" icon="arrow-up-circle-outline" label="Escalate to supervisor" onPress={() => { dispatch({ type: 'ask.escalate', question: question ?? '', siteId: me.siteId }); setDone(true); }} />
  );
}

export function TypingDots() {
  const c = useV2();
  return <Row gap={4} style={{ height: 24 }}>{[0, 1, 2].map((i) => <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.textFaint, opacity: 0.4 + i * 0.25 }} />)}</Row>;
}

/** Officer's shift at a glance: acknowledgements, next tasks, alarms, incoming handover. */
export function BriefCard() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const now = useNow();
  const dispatch = useApp((x) => x.dispatch);
  const open = usePanel((x) => x.open);
  const toAck = s.briefingItems.filter((b) => b.siteId === me.siteId && b.requiresAck && !b.ackByOfficerId[me.id]);
  const tasks = rankTasks(s, me.id, now).slice(0, 3);
  const alarms = s.alarms.filter((a) => a.assigneeId === me.id && a.status !== 'resolved');
  const handover = s.handovers.find((h) => h.incomingId === me.id && h.signedAt && !h.acknowledgedAt);
  return (
    <Surface style={{ gap: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Col gap={2}>
          <T v="smallStrong">{me.shiftId === 'night' ? 'Night shift · 19:00–07:00' : me.shiftId === 'day' ? 'Day shift · 07:00–19:00' : 'Office hours'}</T>
          <T v="caption">{s.sites.find((x) => x.id === me.siteId)?.name ?? 'HQ'} · {zoneName(s, me.siteId, me.zoneId)}</T>
        </Col>
        <Row gap={6}>
          {toAck.length ? <Badge tone="orange" label={`${toAck.length} to acknowledge`} /> : <Badge tone="pass" icon="checkmark" label="Briefing done" />}
        </Row>
      </Row>
      {handover ? (
        <Surface tone="info" padded style={{ gap: 6 }}>
          <T v="label" color={c.info}>Handover from {officerName(s, handover.outgoingId)}</T>
          <T v="small" color={c.text}>{handover.headline}</T>
          <Row><Btn size="sm" kind="navy" icon="checkmark" label="Read & acknowledge" onPress={() => dispatch({ type: 'handover.ack', handoverId: handover.id })} /></Row>
        </Surface>
      ) : null}
      {toAck.map((b) => (
        <Surface key={b.id} tone="orange" style={{ gap: 6 }}>
          <T v="label" color={c.orange}>{b.type === 'policyUpdate' ? 'Policy update' : 'Site instruction'}</T>
          <T v="bodyStrong">{b.title}</T>
          <T v="small" color={c.text}>{b.body}</T>
          <Row wrap>
            <Btn size="sm" icon="checkmark-circle" label="Acknowledge" onPress={() => dispatch({ type: 'briefing.ack', itemId: b.id }, { confirm: true })} />
            {b.sopId ? <Btn size="sm" kind="ghost" icon="document-text-outline" label={`Open ${b.sopId}`} onPress={() => open({ kind: 'doc', id: b.sopId! })} /> : null}
          </Row>
        </Surface>
      ))}
      <Col gap={6}>
        <T v="label">Next up</T>
        {tasks.map((r, i) => (
          <TaskRow key={r.wo.id} id={r.wo.id} title={r.wo.title} sub={`${slaText(r.minutesToSla)} · ${zoneName(s, r.wo.siteId, r.wo.zoneId)} · ≈${r.distanceM} m`} urgent={r.minutesToSla < 30} first={i === 0} />
        ))}
        {!tasks.length ? <T v="small">No open tasks.</T> : null}
      </Col>
      {alarms.length ? (
        <Row wrap gap={6}>
          {alarms.map((a) => <Badge key={a.id} tone={a.status === 'open' ? 'fail' : 'warn'} icon="alert-circle" label={`${a.title} · ${ago(a.raisedAt, now)}`} />)}
        </Row>
      ) : null}
    </Surface>
  );
}

export function TaskRow({ id, title, sub, urgent, first }: { id: string; title: string; sub: string; urgent?: boolean; first?: boolean }) {
  const c = useV2();
  const open = usePanel((x) => x.open);
  return (
    <Pressable onPress={() => open({ kind: 'wo', id })} accessibilityRole="button" accessibilityLabel={title}
      style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: hovered ? c.sunken : c.bg })}>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: urgent ? c.orange : c.borderStrong }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Row gap={6}>{first ? <Badge tone="orange" label="Now" /> : null}<T v="smallStrong" color={c.text} numberOfLines={1} style={{ flexShrink: 1 }}>{title}</T></Row>
        <T v="caption" color={urgent ? c.orange : c.textMuted}>{sub}</T>
      </View>
      <Icon name="chevron-forward" size={18} />
    </Pressable>
  );
}

export function TasksCard() {
  const s = useView();
  const me = useMe();
  const now = useNow();
  const ranked = rankTasks(s, me.id, now);
  const waiting = s.workOrders.filter((w) => w.assigneeId === me.id && w.status === 'pending_approval');
  return (
    <Surface style={{ gap: 6 }}>
      {ranked.map((r, i) => <TaskRow key={r.wo.id} id={r.wo.id} title={r.wo.title} sub={`${r.wo.id} · ${slaText(r.minutesToSla)} · ${zoneName(s, r.wo.siteId, r.wo.zoneId)}`} urgent={r.minutesToSla < 30} first={i === 0} />)}
      {!ranked.length ? <T v="small">Nothing open. Patrol as rostered.</T> : null}
      {waiting.length ? <T v="caption">{waiting.length} closed and waiting for supervisor approval.</T> : null}
    </Surface>
  );
}

export function NoticeCard({ msg }: CardProps) {
  const c = useV2();
  const d = msg.data as { title: string; body: string; kind: string; link?: string };
  const icon = d.kind === 'hr' ? 'wallet-outline' : d.kind === 'friction' ? 'flag-outline' : d.kind === 'closure' ? 'checkmark-done-outline' : d.kind === 'robot' ? 'hardware-chip-outline' : 'notifications-outline';
  return (
    <Surface tone="info" style={{ flexDirection: 'row', gap: 12 }}>
      <Icon name={icon} color={c.info} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="smallStrong">{d.title}</T>
        <T v="small" color={c.text}>{d.body}</T>
        {d.link?.startsWith('/v2') ? <Pressable onPress={() => router.push(d.link as never)}><T v="smallStrong" color={c.info}>Open</T></Pressable> : null}
      </View>
    </Surface>
  );
}

/** Supervisor inbox: closures with evidence, leave, claims, swaps, robot events. Two taps each. */
export function ApprovalsCard() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const open = usePanel((x) => x.open);
  const a = approvalsFor(s, me.id);
  const friction = s.frictionLogs.filter((f) => f.siteId === me.siteId && f.routedTo === 'supervisor' && f.status === 'received');
  const total = a.closures.length + a.leave.length + a.claims.length + a.swaps.length + a.robotEvents.length + friction.length;
  if (!total) return <Surface><T v="small">Nothing waiting. Nice.</T></Surface>;
  return (
    <Surface style={{ gap: 12 }}>
      {a.closures.map((w) => {
        const ver = w.steps.map((st) => s.verifications.find((v) => v.id === st.verificationId)).find(Boolean);
        const photo = ver?.imageUri ?? [...w.attachments, ...w.steps.flatMap((st) => st.attachments)][0]?.uri;
        return (
          <Row key={w.id} align="flex-start" gap={12}>
            {photo ? <Pressable onPress={() => open({ kind: 'wo', id: w.id })} style={{ width: 84 }}><SceneImage uri={photo} height={64} /></Pressable> : null}
            <View style={{ flex: 1, gap: 4 }}>
              <T v="label">Closure · {officerName(s, w.assigneeId)}</T>
              <T v="smallStrong">{w.title}</T>
              {ver ? <T v="caption">{(ver.override ?? ver.verdict).toUpperCase()}: {ver.reason.slice(0, 80)}</T> : null}
              <Row><Btn size="sm" kind="navy" icon="checkmark" label="Approve" onPress={() => dispatch({ type: 'closure.approve', woId: w.id }, { confirm: true })} /><Btn size="sm" kind="ghost" label="Review" onPress={() => open({ kind: 'wo', id: w.id })} /></Row>
            </View>
          </Row>
        );
      })}
      {a.leave.map((r) => (
        <Decision key={r.id} label={`Leave · ${officerName(s, r.officerId)}`} title={`${r.days} day${r.days > 1 ? 's' : ''} ${r.type} · ${r.from}${r.to !== r.from ? ` → ${r.to}` : ''}`} sub={r.reason}
          onApprove={() => dispatch({ type: 'leave.decide', requestId: r.id, decision: 'approved' }, { confirm: true })}
          onReject={() => dispatch({ type: 'leave.decide', requestId: r.id, decision: 'rejected', note: 'Roster cannot be covered' }, { confirm: true })} />
      ))}
      {a.claims.map((cl) => (
        <Decision key={cl.id} label={`Claim · ${officerName(s, cl.officerId)}`} title={`$${cl.amount.toFixed(2)} ${cl.type}`} sub={cl.note}
          onApprove={() => dispatch({ type: 'claim.decide', claimId: cl.id, decision: 'approved' }, { confirm: true })}
          onReject={() => dispatch({ type: 'claim.decide', claimId: cl.id, decision: 'rejected' }, { confirm: true })} />
      ))}
      {a.swaps.map((sw) => (
        <Decision key={sw.id} label="Shift swap" title={`${officerName(s, sw.officerId)} ↔ ${officerName(s, sw.withOfficerId)} · ${sw.date}`} sub={sw.note}
          onApprove={() => dispatch({ type: 'swap.decide', swapId: sw.id, decision: 'approved' }, { confirm: true })}
          onReject={() => dispatch({ type: 'swap.decide', swapId: sw.id, decision: 'rejected' }, { confirm: true })} />
      ))}
      {friction.map((f) => (
        <Row key={f.id} gap={10} align="flex-start" style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="label">Friction · {officerName(s, f.officerId)}</T>
            <T v="small" color={c.text}>{f.text}</T>
            {f.sopStepRef ? <T v="caption">{f.sopStepRef.sopId} step {f.sopStepRef.n}</T> : null}
          </View>
          <Row gap={6}>
            <Btn size="sm" kind="navy" label="Forward to HQ" onPress={async () => {
              const r = await getAi().clusterFriction(f, s.themes);
              const ok = dispatch({ type: 'friction.forward', logId: f.id, themeId: r.themeId, sentiment: r.sentiment });
              const th = s.themes.find((x) => x.id === r.themeId);
              if (ok.ok) useApp.getState().toast({ kind: 'success', title: 'Forwarded to HQ', body: th ? `Joins “${th.label}” (${th.logIds.length + 1} logs)` : 'New theme at HQ' });
            }} />
            <Btn size="sm" kind="ghost" label="Resolve" onPress={() => dispatch({ type: 'friction.resolveLocal', logId: f.id, note: 'Resolved on site by your supervisor.' })} />
          </Row>
        </Row>
      ))}
      {a.robotEvents.length ? <Divider /> : null}
      {a.robotEvents.map((e) => (
        <Row key={e.id} gap={8} style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}><T v="label">Robot · {e.robotId}</T><T v="smallStrong">{e.label}</T></View>
          <Btn size="sm" kind="soft" icon="map-outline" label="Control tower" onPress={() => router.push('/v2/control')} />
        </Row>
      ))}
      <T v="caption" color={c.textFaint}>Every decision is logged with your name and time.</T>
    </Surface>
  );
}

function Decision({ label, title, sub, onApprove, onReject }: { label: string; title: string; sub?: string; onApprove: () => void; onReject: () => void }) {
  return (
    <Row gap={10} align="flex-start" style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{label}</T>
        <T v="smallStrong">{title}</T>
        {sub ? <T v="caption">{sub}</T> : null}
      </View>
      <Row gap={6}><Btn size="sm" kind="navy" label="Approve" onPress={onApprove} /><Btn size="sm" kind="ghost" label="Decline" onPress={onReject} /></Row>
    </Row>
  );
}

export function TeamCard() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const now = useNow();
  const board = shiftBoard(s, me.id).sort((a, b) => Number(b.blocked) - Number(a.blocked));
  const missed = missedCheckpoints(s, me.siteId, now);
  return (
    <Surface style={{ gap: 8 }}>
      {missed.map((m) => <Badge key={m.cp.id} tone="fail" icon="walk" label={`Missed ${m.cp.name} · ${m.officer?.name}`} />)}
      {board.slice(0, 8).map((b) => (
        <Row key={b.officer.id} gap={10}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.blocked ? c.fail : b.officer.status === 'break' ? c.textFaint : c.pass }} />
          <T v="smallStrong" style={{ width: 120 }} numberOfLines={1}>{b.officer.name}</T>
          <T v="caption" numberOfLines={1} style={{ flex: 1 }} color={b.blocked ? c.fail : undefined}>{b.reason ?? b.current?.title ?? `${b.officer.status} · ${b.zone?.name ?? ''}`}</T>
        </Row>
      ))}
      <Pressable onPress={() => router.push('/v2/team')}><T v="smallStrong" color={c.orange}>Open the full board</T></Pressable>
    </Surface>
  );
}

const ALERT_PRESETS: Record<EmergencyAlert['kind'], { title: string; body: string; sopId: string }> = {
  evacuation: { title: 'EVACUATION DRILL: Sector B (L2–L3 Retail)', body: 'Move to your evacuation sector now. Direct the public to exit staircases; no lifts or escalators. Report "Sector clear" to FCC on channel 1.', sopId: 'SOP-EVAC-002' },
  lockdown: { title: 'LOCKDOWN: shelter in place', body: 'Credible threat near L1 Terminal Link. Close and lock shutters in your sector; keep the public away from glass.', sopId: 'SOP-LOCK-001' },
  bolo: { title: 'BOLO: male, 30s, grey hoodie, black backpack', body: 'Last seen L1 Atrium heading to B3 carpark. Observe and report to FCC. Do not confront.', sopId: 'SOP-SEC-011' },
  drill: { title: 'Communications drill', body: 'Acknowledge this alert to confirm your device receives emergency broadcasts.', sopId: 'SOP-OPS-006' },
};

export function AlertCard() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const [kind, setKind] = useState<EmergencyAlert['kind']>('evacuation');
  const active = s.alerts.find((a) => a.active && a.siteId === me.siteId);
  const officers = s.officers.filter((o) => o.siteId === me.siteId && o.role === 'officer' && o.shiftId === me.shiftId);
  if (active) {
    const n = officers.filter((o) => active.acks[o.id]).length;
    return (
      <Surface tone="fail" style={{ gap: 8 }}>
        <T v="bodyStrong">{active.title}</T>
        <Row><T v="small" color={c.text}>{n} of {officers.length} acknowledged</T></Row>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface }}><View style={{ height: 6, borderRadius: 3, width: `${(n / officers.length) * 100}%`, backgroundColor: c.pass }} /></View>
        <Row><Btn size="sm" kind="ghost" label="Stand down" onPress={() => dispatch({ type: 'alert.close', alertId: active.id })} /></Row>
      </Surface>
    );
  }
  const p = ALERT_PRESETS[kind];
  return (
    <Surface style={{ gap: 10 }}>
      <Row wrap gap={6}>{(Object.keys(ALERT_PRESETS) as EmergencyAlert['kind'][]).map((k) => (
        <Pressable key={k} onPress={() => setKind(k)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: kind === k ? c.navy : c.sunken }}>
          <Text style={{ color: kind === k ? c.onNavy : c.text, fontFamily: v2.font.medium, fontSize: 13 }}>{k}</Text>
        </Pressable>
      ))}</Row>
      <T v="bodyStrong">{p.title}</T>
      <T v="small" color={c.text}>{p.body}</T>
      <Btn kind="danger" icon="warning" label="Send to every officer" onPress={() => dispatch({ type: 'alert.send', alert: { id: newId('ALR'), siteId: me.siteId, kind, title: p.title, body: p.body, sopId: p.sopId, sentAt: new Date().toISOString(), sentBy: me.id, acks: {}, active: true } })} />
    </Surface>
  );
}

export function ThemesCard() {
  const c = useV2();
  const s = useView();
  const open = s.themes.filter((t) => !t.decision).sort((a, b) => b.logIds.length - a.logIds.length);
  return (
    <Surface style={{ gap: 8 }}>
      {open.map((t) => (
        <Pressable key={t.id} onPress={() => router.push({ pathname: '/v2/insights', params: { theme: t.id } })}
          style={({ hovered }: { hovered?: boolean }) => ({ padding: 10, borderRadius: 12, backgroundColor: hovered ? c.sunken : 'transparent', gap: 2 })}>
          <T v="smallStrong">{t.label}</T>
          <T v="caption">{t.logIds.length} logs · {t.siteIds.length} sites · sentiment {t.sentimentScore.toFixed(2)}</T>
        </Pressable>
      ))}
      <T v="caption" color={c.textFaint}>Open a theme to decide: change the SOP, fix equipment, or record no change.</T>
    </Surface>
  );
}
