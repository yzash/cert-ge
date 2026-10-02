import { missedCheckpoints, newId, shiftBoard } from '@mozart/actions';
import type { EmergencyAlert } from '@mozart/schema';
import { space, radius } from '@mozart/ui';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { SceneImage, SignatureView } from '@/components/media';
import { Button, Card, Chip, Field, Icon, IconButton, Pill, Row, Screen, Section, Txt } from '@/components/ui';
import { ago, clock, officerName, zoneName } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { getAi, useApp } from '@/store/app';

const TABS = ['Board', 'Closures', 'Friction', 'Handovers', 'Instruct', 'Alerts'] as const;
type TabK = (typeof TABS)[number];

const ALERT_PRESETS: Record<EmergencyAlert['kind'], { title: string; body: string; sopId: string }> = {
  evacuation: { title: 'EVACUATION DRILL: Sector B (L2–L3 Retail)', body: 'Move to your evacuation sector now. Direct the public to exit staircases; no lifts or escalators. Report "Sector clear" to FCC on channel 1.', sopId: 'SOP-EVAC-002' },
  lockdown: { title: 'LOCKDOWN: shelter in place', body: 'Credible threat reported near L1 Terminal Link. Close and lock shutters in your sector and keep the public away from glass.', sopId: 'SOP-LOCK-001' },
  bolo: { title: 'BOLO: male, 30s, grey hoodie, black backpack', body: 'Last seen L1 Atrium heading to B3 carpark at 23:41. Observe and report to FCC. Do not confront.', sopId: 'SOP-SEC-011' },
  drill: { title: 'Communications drill', body: 'Acknowledge this alert to confirm your device receives emergency broadcasts.', sopId: 'SOP-OPS-006' },
};

/** F9 Supervisor view (role-gated tab): board, closures, friction queue, handovers, instructions, alerts. */
export default function Team() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const now = useNow(15000);
  const dispatch = useApp((x) => x.dispatch);
  const [tab, setTab] = useState<TabK>('Board');
  const board = shiftBoard(s, me.id);
  const blocked = board.filter((b) => b.blocked);
  const closures = s.workOrders.filter((w) => w.siteId === me.siteId && w.status === 'pending_approval');
  const queue = s.frictionLogs.filter((f) => f.siteId === me.siteId && f.routedTo === 'supervisor' && f.status === 'received');
  const handovers = s.handovers.filter((h) => h.siteId === me.siteId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const missed = missedCheckpoints(s, me.siteId, now);
  const escalations = s.notifications.filter((n) => n.officerId === me.id && n.kind === 'escalation').slice(0, 3);
  const unread = s.notifications.filter((n) => n.officerId === me.id && !n.read).length;
  const counts: Record<TabK, number> = { Board: blocked.length, Closures: closures.length, Friction: queue.length, Handovers: handovers.filter((h) => !h.acknowledgedAt).length, Instruct: 0, Alerts: s.alerts.filter((a) => a.active).length };

  return (
    <Screen title="Shift board" subtitle={`${me.name} · ${s.sites.find((x) => x.id === me.siteId)?.short} · Night shift`} right={<IconButton icon="notifications-outline" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map((t) => <Chip key={t} label={counts[t] ? `${t} · ${counts[t]}` : t} selected={tab === t} onPress={() => setTab(t)} />)}
      </ScrollView>

      {tab === 'Board' ? (
        <>
          <Row gap={space.sm}>
            {([['On shift', board.length, c.text], ['Blocked', blocked.length, c.fail], ['Closures', closures.length, c.attention], ['Friction', queue.length, c.info]] as const).map(([l, n, col]) => (
              <View key={l} style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: c.border }}>
                <Txt v="h2" color={col}>{n}</Txt><Txt v="caption">{l}</Txt>
              </View>
            ))}
          </Row>
          {missed.map((m) => (
            <Card key={m.cp.id} tone="fail">
              <Row><Icon name="walk" color={c.fail} /><View style={{ flex: 1 }}><Txt v="bodyStrong">Missed checkpoint: {m.cp.name}</Txt><Txt v="caption">{m.officer?.name} · due {clock(m.cp.dueAt)}{m.cp.note ? ` · ${m.cp.note}` : ' · no reason recorded'}</Txt></View></Row>
            </Card>
          ))}
          {escalations.map((n) => (
            <Card key={n.id} tone="info"><Txt v="bodyStrong">{n.title}</Txt><Txt v="small">{n.body}</Txt><Txt v="caption">{ago(n.at, now)}</Txt></Card>
          ))}
          {[...board].sort((a, b) => Number(b.blocked) - Number(a.blocked)).map((b) => (
            <Card key={b.officer.id} tone={b.blocked ? 'fail' : undefined}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt v="caption" color={c.text} style={{ fontWeight: '800' }}>{b.officer.initials}</Txt>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt v="bodyStrong">{b.officer.name}</Txt>
                    <Pill tone={b.blocked ? 'fail' : b.officer.status === 'responding' ? 'attention' : b.officer.status === 'task' ? 'accent' : b.officer.status === 'break' ? 'muted' : 'pass'} label={b.blocked ? 'Blocked' : b.officer.status} />
                  </Row>
                  <Txt v="caption">{b.officer.title} · {b.zone?.name}</Txt>
                  {b.current ? (
                    <Pressable onPress={() => router.push(`/wo/${b.current!.id}`)}><Txt v="small" color={c.primary}>{b.current.id} · {b.current.title}</Txt></Pressable>
                  ) : null}
                  {b.reason ? <Txt v="small" color={c.fail}>{b.reason}</Txt> : null}
                </View>
              </Row>
            </Card>
          ))}
        </>
      ) : null}

      {tab === 'Closures' ? (
        <Section title="Closures to approve">
          {closures.length === 0 ? <Txt v="small">Nothing waiting.</Txt> : null}
          {closures.map((w) => {
            const vers = w.steps.map((st) => s.verifications.find((v) => v.id === st.verificationId)).filter(Boolean);
            const photos = [...w.attachments, ...w.steps.flatMap((st) => st.attachments)];
            return (
              <Card key={w.id}>
                <View style={{ gap: 8 }}>
                  <Row style={{ justifyContent: 'space-between' }}><Txt v="mono" color={c.textMuted}>{w.id}</Txt><Txt v="caption">closed {ago(w.closeRequestedAt ?? w.createdAt, now)}</Txt></Row>
                  <Pressable onPress={() => router.push(`/wo/${w.id}`)}><Txt v="bodyStrong">{w.title}</Txt></Pressable>
                  <Txt v="caption">{officerName(s, w.assigneeId)} · {zoneName(s, w.siteId, w.zoneId)} · {w.steps.filter((x) => x.done).length}/{w.steps.length} steps</Txt>
                  {vers.map((v) => (
                    <View key={v!.id} style={{ gap: 4 }}>
                      <SceneImage uri={v!.imageUri} height={150} />
                      <Row><Pill status={v!.override ?? v!.verdict} label={`${(v!.override ?? v!.verdict).toUpperCase()}${v!.override ? ' (override)' : ''}`} /><Txt v="caption" style={{ flex: 1 }} numberOfLines={2}>{v!.overrideReason ?? v!.reason}</Txt></Row>
                    </View>
                  ))}
                  {!vers.length && photos.length ? <SceneImage uri={photos[0].uri} height={150} /> : null}
                  <SignatureView sig={w.signature} height={56} />
                  <Row>
                    <Button style={{ flex: 1 }} kind="success" icon="checkmark-circle" label="Approve" onPress={() => dispatch({ type: 'closure.approve', woId: w.id }, { confirm: true })} />
                    <Button kind="secondary" label="Review" onPress={() => router.push(`/wo/${w.id}`)} />
                  </Row>
                </View>
              </Card>
            );
          })}
        </Section>
      ) : null}

      {tab === 'Friction' ? <FrictionQueue /> : null}

      {tab === 'Handovers' ? (
        <Section title="Handovers">
          {handovers.map((h) => (
            <Card key={h.id} onPress={() => router.push(`/handover/${h.id}`)}>
              <Txt v="caption">{officerName(s, h.outgoingId)} → {officerName(s, h.incomingId)} · signed {clock(h.signedAt)}</Txt>
              <Txt v="bodyStrong" numberOfLines={2}>{h.headline}</Txt>
              <Row style={{ marginTop: 6 }}><Pill tone={h.acknowledgedAt ? 'pass' : 'attention'} label={h.acknowledgedAt ? `Acknowledged ${clock(h.acknowledgedAt)}` : 'Awaiting acknowledgement'} /></Row>
            </Card>
          ))}
        </Section>
      ) : null}

      {tab === 'Instruct' ? <Instruct /> : null}
      {tab === 'Alerts' ? <Alerts /> : null}
    </Screen>
  );
}

function FrictionQueue() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const [busy, setBusy] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const queue = s.frictionLogs.filter((f) => f.siteId === me.siteId && f.routedTo === 'supervisor' && f.status === 'received');
  const done = s.frictionLogs.filter((f) => f.siteId === me.siteId && (f.routedTo === 'hq' || f.routedTo === 'local') && Date.parse(f.updatedAt) > Date.now() - 12 * 3600_000).slice(0, 5);

  async function forward(id: string) {
    const log = s.frictionLogs.find((f) => f.id === id)!;
    setBusy(id);
    const r = await getAi().clusterFriction(log, s.themes);
    const res = dispatch({ type: 'friction.forward', logId: id, themeId: r.themeId, sentiment: r.sentiment });
    setBusy(null);
    if (res.ok) {
      const th = s.themes.find((t) => t.id === r.themeId);
      useApp.getState().toast({ kind: 'success', title: 'Forwarded to HQ', body: th ? `Joins theme “${th.label}” (${th.logIds.length + 1} logs, ${new Set([...th.siteIds, log.siteId]).size} sites)` : 'New theme created at HQ' });
    }
  }

  return (
    <Section title="Friction queue">
      {queue.length === 0 ? <Txt v="small">Queue is empty.</Txt> : null}
      {queue.map((f) => (
        <Card key={f.id}>
          <View style={{ gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}><Pill tone="muted" label={f.category.toUpperCase()} /><Txt v="caption">{officerName(s, f.officerId)} · {ago(f.createdAt)}</Txt></Row>
            <Txt>{f.text}</Txt>
            {f.sopStepRef ? <Txt v="caption" color={c.primary}>{f.sopStepRef.sopId} step {f.sopStepRef.n}</Txt> : null}
            {resolving === f.id ? (
              <View style={{ gap: 6 }}>
                <Field label="Local resolution" value={note} onChangeText={setNote} placeholder="e.g. Spare charger installed in FCC tonight" />
                <Row><Button size="sm" label="Resolve" disabled={!note.trim()} onPress={() => { dispatch({ type: 'friction.resolveLocal', logId: f.id, note }); setResolving(null); setNote(''); }} /><Button size="sm" kind="ghost" label="Cancel" onPress={() => setResolving(null)} /></Row>
              </View>
            ) : (
              <Row>
                <Button style={{ flex: 1 }} icon="arrow-up-circle-outline" label="Forward to HQ" loading={busy === f.id} onPress={() => void forward(f.id)} />
                <Button kind="secondary" label="Resolve locally" onPress={() => setResolving(f.id)} />
              </Row>
            )}
          </View>
        </Card>
      ))}
      {done.length ? <Txt v="label">Recently handled</Txt> : null}
      {done.map((f) => <Txt key={f.id} v="caption">• {f.text.slice(0, 70)} → {f.routedTo === 'hq' ? `HQ (${f.status.replace('_', ' ')})` : 'resolved locally'}</Txt>)}
    </Section>
  );
}

function Instruct() {
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ack, setAck] = useState(true);
  const mine = s.briefingItems.filter((b) => b.createdBy === me.id).slice(0, 5);
  const officers = s.officers.filter((o) => o.siteId === me.siteId && o.role === 'officer' && o.shiftId === me.shiftId).length;
  return (
    <Section title="Site instruction → next briefing">
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Gate 4: stay at the gate, FCC sends the key" />
      <Field label="Instruction" value={body} onChangeText={setBody} multiline />
      <Row><Switch value={ack} onValueChange={setAck} /><Txt v="small">Require acknowledgement</Txt></Row>
      <Button icon="megaphone-outline" label="Publish to tonight’s briefing" disabled={!title.trim() || !body.trim()}
        onPress={() => { const r = dispatch({ type: 'instruction.publish', itemId: newId('BRF'), siteId: me.siteId, title, body, requiresAck: ack }, { confirm: true }); if (r.ok) { setTitle(''); setBody(''); useApp.getState().toast({ kind: 'success', title: 'Published', body: 'Appears on every officer’s Shift Home at next sync.' }); } }} />
      {mine.map((b) => (
        <Card key={b.id}><Txt v="bodyStrong">{b.title}</Txt><Txt v="caption">{b.requiresAck ? `${Object.keys(b.ackByOfficerId).length}/${officers} acknowledged` : 'Info only'} · {clock(b.createdAt)}</Txt></Card>
      ))}
    </Section>
  );
}

function Alerts() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const [kind, setKind] = useState<EmergencyAlert['kind']>('evacuation');
  const active = s.alerts.find((a) => a.active && a.siteId === me.siteId);
  const officers = s.officers.filter((o) => o.siteId === me.siteId && o.role === 'officer' && o.shiftId === me.shiftId);
  if (active) {
    const acked = officers.filter((o) => active.acks[o.id]);
    const elapsed = Math.round((Date.now() - Date.parse(active.sentAt)) / 1000);
    return (
      <Section title="Live alert">
        <Card tone="fail">
          <View style={{ gap: 8 }}>
            <Txt v="bodyStrong">{active.title}</Txt>
            <Txt v="caption">Sent {clock(active.sentAt)} · {elapsed}s ago</Txt>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: c.border, overflow: 'hidden' }}>
              <View style={{ width: `${(acked.length / officers.length) * 100}%`, height: '100%', backgroundColor: c.pass }} />
            </View>
            <Txt v="bodyStrong">{acked.length} of {officers.length} acknowledged</Txt>
            {acked.map((o) => <Txt key={o.id} v="caption">✓ {o.name} · {clock(active.acks[o.id])}</Txt>)}
            <Button kind="secondary" label="Stand down" onPress={() => dispatch({ type: 'alert.close', alertId: active.id })} />
          </View>
        </Card>
      </Section>
    );
  }
  const preset = ALERT_PRESETS[kind];
  return (
    <Section title="Emergency broadcast (command centre)">
      <Row wrap>{(Object.keys(ALERT_PRESETS) as EmergencyAlert['kind'][]).map((k) => <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />)}</Row>
      <Card><Txt v="bodyStrong">{preset.title}</Txt><Txt v="small">{preset.body}</Txt><Txt v="caption">SOP card: {preset.sopId}</Txt></Card>
      <Button kind="danger" size="lg" icon="warning" label="Send high-priority alert"
        onPress={() => dispatch({ type: 'alert.send', alert: { id: newId('ALR'), siteId: me.siteId, kind, title: preset.title, body: preset.body, sopId: preset.sopId, sentAt: new Date().toISOString(), sentBy: me.id, acks: {}, active: true } })} />
      <Txt v="caption">Production: FCM high-priority message that overrides Do Not Disturb. Demo: every officer tab shows a full-screen takeover on next sync.</Txt>
    </Section>
  );
}
