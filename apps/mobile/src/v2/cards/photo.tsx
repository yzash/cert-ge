/**
 * Photo-first security incident report: take a photo on the phone, Mozart drafts the incident
 * (DEMO: pregenerated per category; LIVE: Gemini multimodal via the BFF), the officer checks the
 * fields and taps Submit. Nothing is written until that tap.
 */
import { newId, newRecordNumber } from '@mozart/actions';
import type { PhotoAnalysis, PhotoCategory } from '@mozart/schema';
import { photoIncidentDrafts, securityPhotos } from '@mozart/fixtures';
import type { Attachment, ReportDraft, Severity } from '@mozart/schema';
import { v2 } from '@mozart/ui';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SceneImage } from '@/components/media';
import { capturePhoto } from '@/lib/camera';
import { useMe, useOnline, useView } from '@/lib/hooks';
import { getAi, useApp } from '@/store/app';
import { useChat } from '../chatStore';
import { usePanel } from '../panels';
import { Badge, Btn, Chip, Col, Field, Icon, Row, Surface, T, useV2 } from '../ui';
import type { CardProps } from './core';

const SEVS: Severity[] = ['low', 'medium', 'high', 'critical'];
const CATS = Object.keys(photoIncidentDrafts) as PhotoCategory[];

type Result = PhotoAnalysis & { meta: { mode: string; fallback?: boolean } };

export function PhotoReportCard({ threadId, msg }: CardProps) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const online = useOnline();
  const lang = useApp((x) => x.settings.lang);
  const dispatch = useApp((x) => x.dispatch);
  const d = (msg.data ?? {}) as { photo?: Attachment; auto?: boolean; recordId?: string; title?: string; utterance?: string };
  const [photo, setPhoto] = useState<Attachment | null>(d.photo && !d.photo.uri.endsWith('photo-kept-on-record') ? d.photo : null);
  const [res, setRes] = useState<Result | null>(null);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [cat, setCat] = useState<PhotoCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const zones = s.sites.find((x) => x.id === me.siteId)?.zones ?? [];
  const zh = lang === 'zh';

  useEffect(() => { if (photo && !d.recordId) void analyse(photo); }, []);
  if (d.recordId) {
    return (
      <Surface tone="pass" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="checkmark-circle" color={c.pass} />
        <Col gap={2} style={{ flex: 1 }}>
          <T v="smallStrong">Incident {d.recordId} submitted with photo</T>
          <T v="caption">{d.title} · FCC and your supervisor are notified.</T>
        </Col>
      </Surface>
    );
  }

  async function analyse(p: Attachment, category?: PhotoCategory) {
    setBusy(true);
    const r = await getAi().describePhoto({
      imageUri: p.uri, category, note: d.utterance && !/^(report this|report with a photo)$/i.test(d.utterance) ? d.utterance : undefined,
      officerId: me.id, officerZoneId: me.zoneId, ctx: { siteId: me.siteId, sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs },
    });
    setRes(r as Result);
    setDraft({ ...r.draft });
    setCat(r.category);
    setBusy(false);
  }
  async function take(source: 'camera' | 'library' = 'camera') {
    const a = await capturePhoto({ source });
    if (!a) return;
    setPhoto(a);
    await analyse(a);
  }
  function pickDemo(id: string, label: string) {
    const a: Attachment = { id: `att-${Date.now().toString(36)}`, kind: 'fixtureImage', uri: `fixture://${id}`, caption: label, at: new Date().toISOString() };
    setDemoOpen(false);
    setPhoto(a);
    void analyse(a);
  }

  // 1. no photo yet
  if (!photo) {
    return (
      <Surface style={{ gap: 12 }}>
        <Pressable onPress={() => void take('camera')} accessibilityRole="button" accessibilityLabel="Take photo"
          style={({ pressed }) => ({ height: 150, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: c.orange, backgroundColor: pressed ? c.orangeSoft : c.sunken, alignItems: 'center', justifyContent: 'center', gap: 8 })}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={30} color="#fff" />
          </View>
          <T v="smallStrong">{zh ? '拍照' : 'Take photo'}</T>
          <T v="caption">Opens your phone camera</T>
        </Pressable>
        <Row wrap>
          <Btn size="sm" kind="ghost" icon="images-outline" label="From gallery" onPress={() => void take('library')} />
          <Btn size="sm" kind="ghost" icon="albums-outline" label="Use a demo photo" onPress={() => setDemoOpen((o) => !o)} />
        </Row>
        {demoOpen ? <DemoPhotos onPick={pickDemo} /> : null}
        <T v="caption" color={c.textFaint}>Stay at a safe distance. Don’t approach a suspicious item or person to take the photo.</T>
      </Surface>
    );
  }

  // 2. analysing
  if (busy || !res || !draft) {
    return (
      <Surface style={{ gap: 12 }}>
        <View style={{ maxWidth: 280 }}><SceneImage uri={photo.uri} height={200} /></View>
        <Row><ActivityIndicator color={c.orange} /><T v="small">Looking at the photo: what, where, how serious, which SOP…</T></Row>
      </Surface>
    );
  }

  // 3. review and submit
  const sop = s.sops.find((x) => x.id === draft.recommendedSopId);
  const set = <K extends keyof ReportDraft>(k: K, v: ReportDraft[K]) => setDraft({ ...draft, [k]: v });
  const ready = !!draft.zoneId && !!draft.description?.trim() && !!draft.severity;
  return (
    <Surface style={{ gap: 12 }}>
      <Row wrap gap={6}>
        <Badge tone="pass" icon="sparkles" label={`Draft in ${(res.latencyMs / 1000).toFixed(1)} s`} />
        {res.meta.fallback ? <Badge tone="warn" label="LIVE failed · DEMO draft" /> : null}
        {res.meta.mode === 'DEMO' || res.meta.fallback ? <Badge label="Pregenerated (DEMO)" /> : <Badge tone="info" label="Read from photo" />}
      </Row>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View style={{ width: 120 }}><SceneImage uri={photo.uri} height={150} /></View>
        <Col gap={4} style={{ flex: 1 }}>
          <T v="label">What I see</T>
          {res.observations.map((o) => <Row key={o} gap={6} style={{ alignItems: 'flex-start' }}><Icon name="eye-outline" size={14} color={c.textMuted} /><T v="caption" color={c.text} style={{ flex: 1 }}>{o}</T></Row>)}
          <Btn size="sm" kind="ghost" icon="camera-reverse-outline" label="Retake" onPress={() => void take('camera')} />
        </Col>
      </Row>
      <T v="label">Category</T>
      <Row wrap gap={6}>
        {CATS.map((k) => <Chip key={k} label={zh ? photoIncidentDrafts[k].label_zh : photoIncidentDrafts[k].label} selected={cat === k} onPress={() => { setCat(k); void analyse(photo, k); }} />)}
      </Row>
      <Field label="Title" value={draft.title ?? ''} onChangeText={(v) => set('title', v)} />
      <T v="label">Location {draft.zoneId ? '· from your GPS zone' : '· required'}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {zones.map((z) => <Chip key={z.id} label={z.name} selected={draft.zoneId === z.id} onPress={() => setDraft({ ...draft, zoneId: z.id, location: z.name })} />)}
      </ScrollView>
      <T v="label">Severity</T>
      <Row wrap gap={6}>{SEVS.map((v) => <Chip key={v} label={v[0].toUpperCase() + v.slice(1)} selected={draft.severity === v} onPress={() => set('severity', v)} />)}</Row>
      <Field label="Description" value={draft.description ?? ''} onChangeText={(v) => set('description', v)} multiline />
      {sop ? (
        <Pressable onPress={() => usePanel.getState().open({ kind: 'doc', id: sop.id })}>
          <T v="small">Follow: <Text style={{ color: c.orange, fontFamily: v2.font.semibold }}>{sop.code} {sop.title}</Text></T>
        </Pressable>
      ) : null}
      <Btn size="lg" icon={online ? 'send' : 'cloud-offline-outline'} label={online ? 'Submit incident' : 'Save offline'} disabled={!ready}
        onPress={() => {
          const recordId = newRecordNumber('INC');
          const transcript = `[photo] ${draft.title ?? ''}`;
          const r = dispatch({
            type: 'report.confirm', recordId, draft, attachments: [{ ...photo, caption: photo.caption ?? 'Photo taken on site' }],
            report: { id: newId('VR'), officerId: me.id, siteId: me.siteId, transcript, extractedDraft: res.draft, confidence: res.confidence, syncStatus: online ? 'synced' : 'pending', createdAt: new Date().toISOString(), draft: true },
          }, { confirm: true });
          if (r.ok) useChat.getState().patchData(threadId, msg.id, { recordId, title: draft.title });
        }} />
      <T v="caption" color={c.textFaint}>
        {res.meta.mode === 'DEMO' || res.meta.fallback
          ? 'DEMO: the draft is pregenerated for the chosen category. In LIVE, Gemini reads the photo itself; ids are checked against the site register.'
          : 'Drafted from the photo. Check every field before you submit.'}
      </T>
    </Surface>
  );
}

function DemoPhotos({ onPick }: { onPick: (id: string, label: string) => void }) {
  const c = useV2();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {securityPhotos.map((p) => (
        <Pressable key={p.id} onPress={() => onPick(p.id, p.label)} style={{ width: 96, gap: 4 }} accessibilityLabel={p.label}>
          <SceneImage uri={`fixture://${p.id}`} height={128} style={{ borderWidth: 1, borderColor: c.border }} />
          <T v="caption" numberOfLines={2}>{p.label}</T>
        </Pressable>
      ))}
    </ScrollView>
  );
}
