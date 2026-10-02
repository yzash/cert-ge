import { checkpointState, newId } from '@mozart/actions';
import { voiceClips } from '@mozart/fixtures';
import type { Checkpoint, ExtractResult } from '@mozart/schema';
import { space } from '@mozart/ui';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Button, Card, Chip, Field, Icon, Pill, Row, Screen, Txt } from '@/components/ui';
import { clock, zoneName } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { getAi, useApp } from '@/store/app';

/** F7 Guard tour: NFC/QR checkpoints with a voice note that becomes a structured observation. */
export default function Tour() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const now = useNow(15000);
  const dispatch = useApp((x) => x.dispatch);
  const tour = s.tours.find((t) => t.officerId === me.id);
  const [active, setActive] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [transcript, setTranscript] = useState('');
  const [extract, setExtract] = useState<ExtractResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  if (!tour) return <Screen title="Guard tour"><Txt>No tour assigned this shift.</Txt></Screen>;
  const states = tour.checkpoints.map((cp) => checkpointState(cp, tour, now));
  const done = states.filter((x) => x === 'scanned').length;
  const missed = tour.checkpoints.filter((_, i) => states[i] === 'missed');

  async function scan(cp: Checkpoint) {
    setScanning(cp.id);
    setStartedAt(Date.now());
    await new Promise((r) => setTimeout(r, 700));
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dispatch({ type: 'tour.scan', tourId: tour!.id, checkpointId: cp.id });
    setScanning(null);
    setActive(cp.id);
    setTranscript('');
    setExtract(null);
  }

  async function speak(clipId: string) {
    const clip = voiceClips.find((v) => v.id === clipId)!;
    let last = '';
    for await (const p of getAi().transcribe(clip.transcript, { durationSec: clip.durationSec })) { last = p; setTranscript(p); }
    setBusy(true);
    const r = await getAi().extractReport({ transcript: last, clipId, officerId: me.id, officerZoneId: tour!.checkpoints.find((x) => x.id === active)?.zoneId, ctx: { siteId: me.siteId, sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs } });
    setExtract(r);
    setBusy(false);
  }

  function saveNote(cp: Checkpoint) {
    if (!extract) return;
    const report = {
      id: newId('VR'), officerId: me.id, siteId: me.siteId, transcript, extractedDraft: extract.draft, confirmedDraft: extract.draft,
      confidence: extract.confidence, syncStatus: 'synced' as const, createdAt: new Date().toISOString(), draft: false, checkpointId: cp.id,
    };
    dispatch({ type: 'tour.note', tourId: tour!.id, checkpointId: cp.id, note: extract.draft.title ?? transcript, report });
    const secs = Math.round((Date.now() - startedAt) / 1000);
    useApp.getState().toast({ kind: 'success', title: `${cp.name} done`, body: `Scan + voice note in ${secs} s` });
    setActive(null);
  }

  return (
    <Screen title="Guard tour" subtitle={`${tour.name} · ${done}/${tour.checkpoints.length} scanned`}>
      <Row gap={4}>
        {states.map((st, i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: st === 'scanned' ? c.pass : st === 'missed' ? c.fail : st === 'due' ? c.primary : c.border }} />)}
      </Row>
      {missed.length ? (
        <Card tone="fail">
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="alert-circle" color={c.fail} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="bodyStrong">Missed checkpoint{missed.length > 1 ? 's' : ''}: {missed.map((m) => m.id).join(', ')}</Txt>
              <Txt v="small">Not scanned within the {tour.graceMinutes}-minute grace period. Your supervisor has been alerted (SOP-PAT-003).</Txt>
            </View>
          </Row>
        </Card>
      ) : null}
      {tour.checkpoints.map((cp, i) => {
        const st = states[i];
        const isActive = active === cp.id;
        return (
          <Card key={cp.id} tone={st === 'due' ? 'accent' : st === 'missed' ? 'fail' : undefined}>
            <View style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row><Txt v="mono" color={c.textMuted}>{cp.id}</Txt><Pill status={st === 'scanned' ? 'pass' : st === 'missed' ? 'fail' : st === 'due' ? 'high' : 'low'} label={st === 'scanned' ? `Scanned ${clock(cp.scannedAt)}` : st === 'missed' ? 'Missed' : st === 'due' ? `Due ${clock(cp.dueAt)}` : `Due ${clock(cp.dueAt)}`} /></Row>
                <Txt v="caption">{cp.tag}</Txt>
              </Row>
              <Txt v="bodyStrong">{cp.name}</Txt>
              <Txt v="caption">{zoneName(s, tour.siteId, cp.zoneId)}</Txt>
              {cp.note ? <Txt v="small">🎙 {cp.note}</Txt> : null}
              {st !== 'scanned' && !isActive ? (
                <Row wrap>
                  <Button icon="radio-outline" label={scanning === cp.id ? 'Hold phone to tag…' : 'Scan tag (NFC/QR)'} loading={scanning === cp.id} onPress={() => void scan(cp)} />
                  {st === 'missed' && !cp.note ? <Button kind="ghost" icon="create-outline" label="Record reason" onPress={() => setActive(`reason-${cp.id}`)} /> : null}
                </Row>
              ) : null}
              {active === `reason-${cp.id}` ? (
                <View style={{ gap: 6 }}>
                  <Field label="Reason for the miss" value={reason} onChangeText={setReason} placeholder="e.g. Responding to supervisory alarm at L3 panel" />
                  <Button size="sm" label="Save reason" disabled={!reason.trim()} onPress={() => { dispatch({ type: 'tour.note', tourId: tour.id, checkpointId: cp.id, note: `Missed: ${reason.trim()}` }); setActive(null); setReason(''); }} />
                </View>
              ) : null}
              {isActive ? (
                <View style={{ gap: 8, backgroundColor: c.surfaceAlt, padding: space.md, borderRadius: 12 }}>
                  <Txt v="label">Voice note at checkpoint</Txt>
                  <Row wrap>
                    {voiceClips.filter((v) => v.checkpoint).map((v) => <Chip key={v.id} icon="mic-outline" label={v.label} onPress={() => void speak(v.id)} />)}
                  </Row>
                  {transcript ? <Txt v="small" style={{ fontStyle: 'italic' }}>“{transcript}”</Txt> : null}
                  {busy ? <Row><ActivityIndicator color={c.primary} /><Txt v="small">Structuring observation…</Txt></Row> : null}
                  {extract ? (
                    <View style={{ gap: 4 }}>
                      <Row wrap><Pill tone="info" label={extract.draft.type ?? 'observation'} /><Pill status={extract.draft.severity ?? 'low'} label={extract.draft.severity ?? 'low'} />{extract.draft.assetId ? <Pill tone="muted" label={s.assets.find((a) => a.id === extract.draft.assetId)?.name ?? ''} /> : null}</Row>
                      <Txt v="bodyStrong">{extract.draft.title}</Txt>
                    </View>
                  ) : null}
                  <Row>
                    <Button size="sm" label="Save" disabled={!extract} onPress={() => saveNote(cp)} />
                    <Button size="sm" kind="ghost" label="Skip note" onPress={() => setActive(null)} />
                  </Row>
                </View>
              ) : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
