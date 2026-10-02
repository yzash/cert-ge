import { newId } from '@mozart/actions';
import type { HandoverSection } from '@mozart/schema';
import { space } from '@mozart/ui';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { SignaturePad } from '@/components/media';
import { SourceChips } from '@/components/sources';
import { Button, Card, Chip, Field, ModeBadge, Pill, Row, Screen, Section, Txt } from '@/components/ui';
import { clock, shiftStart } from '@/lib/format';
import { useMe, useOnline, useView } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { getAi, useApp } from '@/store/app';

/** F5 Shift Handover: one tap drafts it from the shift's records; officer edits, signs, submits. */
export default function HandoverCompose() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const online = useOnline();
  const dispatch = useApp((x) => x.dispatch);
  const mode = useApp((x) => x.settings.aiMode);
  const incomingOptions = s.officers.filter((o) => o.siteId === me.siteId && o.role === 'officer' && o.shiftId !== me.shiftId);
  const [incomingId, setIncomingId] = useState(incomingOptions[0]?.id ?? 'o-arun');
  const [busy, setBusy] = useState(false);
  const [headline, setHeadline] = useState('');
  const [sections, setSections] = useState<HandoverSection[] | null>(null);
  const [meta, setMeta] = useState<{ mode: string; fallback?: boolean; latencyMs: number; model: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [sig, setSig] = useState<string | null>(null);
  const mine = s.handovers.filter((h) => h.outgoingId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function generate() {
    setBusy(true);
    const r = await getAi().generateHandover({
      officerId: me.id, officer: me, incoming: s.officers.find((o) => o.id === incomingId), shiftStart: shiftStart(s),
      workOrders: s.workOrders, incidents: s.incidents, alarms: s.alarms, voiceReports: s.voiceReports, verifications: s.verifications,
      frictionLogs: s.frictionLogs, tours: s.tours, ctx: { siteId: me.siteId, sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs },
    });
    setHeadline(r.headline);
    setSections(r.sections);
    setMeta({ mode: r.meta.mode, fallback: r.meta.fallback, latencyMs: r.latencyMs, model: r.model });
    setBusy(false);
  }

  function submit() {
    if (!sections || !sig) return;
    const id = newId('HND');
    const r = dispatch({
      type: 'handover.sign',
      handover: { id, siteId: me.siteId, shiftId: me.shiftId, outgoingId: me.id, incomingId, headline, summary: sections, notes, signature: sig, createdAt: new Date().toISOString() },
    }, { confirm: true });
    if (r.ok) {
      useApp.getState().toast({ kind: 'success', title: 'Handover signed', body: online ? `Sent to ${s.officers.find((o) => o.id === incomingId)?.name}.` : 'Pending sync.' });
      router.replace(`/handover/${id}`);
    }
  }

  const editItem = (si: number, ii: number, text: string) =>
    setSections((sec) => sec!.map((x, i) => (i !== si ? x : { ...x, items: x.items.map((it, j) => (j === ii ? { ...it, text } : it)) })));

  return (
    <Screen title="Shift handover" subtitle={`${me.name} → next shift`} back right={meta ? <View style={{ paddingRight: 8 }}><ModeBadge mode={meta.mode} fallback={meta.fallback} /></View> : undefined}>
      {!sections ? (
        <>
          <Section title="Incoming officer">
            <Row wrap>{incomingOptions.map((o) => <Chip key={o.id} label={o.name} selected={incomingId === o.id} onPress={() => setIncomingId(o.id)} />)}</Row>
          </Section>
          <Card>
            <View style={{ gap: space.md }}>
              <Txt v="bodyStrong">Generate from tonight’s records</Txt>
              <Txt v="small">Work orders, incidents, voice reports, verifications, alarms, guard tour and friction logs since {clock(shiftStart(s))}. Every line links to its source record.</Txt>
              <Button size="lg" icon="sparkles" label={busy ? 'Generating…' : 'Generate handover'} loading={busy} onPress={() => void generate()} />
            </View>
          </Card>
          {busy ? <Row><ActivityIndicator color={c.primary} /><Txt v="small">Summarising {s.workOrders.filter((w) => w.assigneeId === me.id).length} work orders and your shift activity…</Txt></Row> : null}
          {mine.length ? (
            <Section title="Your recent handovers">
              {mine.slice(0, 3).map((h) => (
                <Card key={h.id} onPress={() => router.push(`/handover/${h.id}`)}>
                  <Txt v="bodyStrong" numberOfLines={2}>{h.headline}</Txt>
                  <Row style={{ marginTop: 6 }}>
                    <Pill tone={h.acknowledgedAt ? 'pass' : 'attention'} label={h.acknowledgedAt ? `Acknowledged ${clock(h.acknowledgedAt)}` : 'Awaiting acknowledgement'} />
                  </Row>
                </Card>
              ))}
            </Section>
          ) : null}
        </>
      ) : (
        <>
          <Row wrap>
            <Pill tone="pass" icon="sparkles" label={`Drafted in ${((meta?.latencyMs ?? 0) / 1000).toFixed(1)} s`} />
            <Pill tone="muted" label="Draft · edit before signing" />
          </Row>
          <Field label="Headline" value={headline} onChangeText={setHeadline} multiline />
          {sections.map((sec, si) => (
            <Section key={sec.id} title={sec.title}>
              {sec.items.map((it, ii) => (
                <Card key={it.id} style={{ padding: space.md }}>
                  <TextInput value={it.text} onChangeText={(t) => editItem(si, ii, t)} multiline
                    style={{ color: c.text, fontSize: 16, lineHeight: 22, minHeight: 44 }} accessibilityLabel={`Edit ${sec.title} item`} />
                  <SourceChips refs={it.sourceRefs} />
                </Card>
              ))}
            </Section>
          ))}
          <Field label="Anything else for the next shift?" value={notes} onChangeText={setNotes} multiline placeholder="Optional" />
          <Section title="Sign">
            <SignaturePad onChange={setSig} />
          </Section>
          <Row>
            <Button kind="ghost" icon="refresh" label="Regenerate" onPress={() => void generate()} />
            <Button style={{ flex: 1 }} size="lg" icon="create-outline" label="Sign and submit" disabled={!sig} onPress={submit} />
          </Row>
        </>
      )}
    </Screen>
  );
}
