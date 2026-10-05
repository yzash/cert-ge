import { checkpointState, newId } from '@mozart/actions';
import { voiceClips } from '@mozart/fixtures';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { clock, zoneName } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { getAi, useApp } from '@/store/app';
import { PageHeader, useWide } from '@/v2/shell';
import { Badge, Btn, Chip, Col, Meter, Row, Surface, T, useV2 } from '@/v2/ui';

export default function Tour() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const now = useNow(15000);
  const wide = useWide();
  const dispatch = useApp((x) => x.dispatch);
  const tour = s.tours.find((t) => t.officerId === me.id);
  const [active, setActive] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; title?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!tour) return <View style={{ flex: 1 }}><PageHeader title="Guard tour" /><T>No tour this shift.</T></View>;
  const states = tour.checkpoints.map((cp) => checkpointState(cp, tour, now));
  const done = states.filter((x) => x === 'scanned').length;
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Guard tour" subtitle={`${tour.name} · ${done}/${tour.checkpoints.length} scanned`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: wide ? 32 : 12, paddingBottom: 60, gap: 12, maxWidth: 820 }}>
        <Meter value={done / tour.checkpoints.length} tone="orange" height={8} />
        {tour.checkpoints.map((cp, i) => {
          const st = states[i];
          return (
            <Surface key={cp.id} tone={st === 'missed' ? 'fail' : st === 'due' ? 'orange' : undefined} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Col gap={2}><T v="smallStrong">{cp.name}</T><T v="caption">{zoneName(s, tour.siteId, cp.zoneId)} · {cp.tag}</T></Col>
                <Badge tone={st === 'scanned' ? 'pass' : st === 'missed' ? 'fail' : st === 'due' ? 'orange' : 'neutral'} label={st === 'scanned' ? `Scanned ${clock(cp.scannedAt)}` : st === 'missed' ? 'Missed · supervisor alerted' : `Due ${clock(cp.dueAt)}`} />
              </Row>
              {cp.note ? <T v="small" color={c.text}>Note: {cp.note}</T> : null}
              {st !== 'scanned' && active !== cp.id ? <Row><Btn size="sm" kind="navy" icon="radio-outline" label="Scan tag" onPress={() => { dispatch({ type: 'tour.scan', tourId: tour.id, checkpointId: cp.id }); setActive(cp.id); setNote(null); }} /></Row> : null}
              {active === cp.id ? (
                <Col gap={8}>
                  <Row wrap gap={6}>{voiceClips.filter((v) => v.checkpoint).map((v) => <Chip key={v.id} icon="mic-outline" label={v.label} onPress={async () => {
                    setBusy(true);
                    const r = await getAi().extractReport({ transcript: v.transcript, clipId: v.id, officerId: me.id, officerZoneId: cp.zoneId, ctx: { siteId: me.siteId, sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs } });
                    setNote({ text: v.transcript, title: r.draft.title ?? undefined });
                    setBusy(false);
                  }} />)}</Row>
                  {busy ? <ActivityIndicator color={c.orange} /> : null}
                  {note ? <T v="small" style={{ fontStyle: 'italic' }}>“{note.text}” → {note.title}</T> : null}
                  <Row><Btn size="sm" label="Save" disabled={!note} onPress={() => { dispatch({ type: 'tour.note', tourId: tour.id, checkpointId: cp.id, note: note!.title ?? note!.text }); setActive(null); }} /><Btn size="sm" kind="ghost" label="Skip" onPress={() => setActive(null)} /></Row>
                </Col>
              ) : null}
            </Surface>
          );
        })}
      </ScrollView>
    </View>
  );
}
