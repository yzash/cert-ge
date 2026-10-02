import { newId, newRecordNumber } from '@mozart/actions';
import { voiceClips } from '@mozart/fixtures';
import type { Attachment, DraftField, ExtractResult, ReportDraft, ReportType, Severity } from '@mozart/schema';
import { space, radius } from '@mozart/ui';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { AttachmentStrip, PhotoPicker } from '@/components/attach';
import { Button, Chip, ConfidenceTag, Field, Header, Icon, ModeBadge, Pill, Row, Txt } from '@/components/ui';
import { useMe, useOnline, useView } from '@/lib/hooks';
import { speechSupported, startDictation } from '@/lib/speech';
import { useTheme } from '@/lib/theme';
import { getAi, useApp } from '@/store/app';

const TYPES: [ReportType, string][] = [['incident', 'Incident'], ['corrective_wo', 'Work order'], ['hazard', 'Hazard'], ['observation', 'Observation']];
const SEVS: Severity[] = ['low', 'medium', 'high', 'critical'];
const REQUIRED: DraftField[] = ['type', 'zoneId', 'description'];

type Phase = 'capture' | 'extracting' | 'review';

/** F3 Voice-to-Report: hold to talk → transcript → structured draft → officer confirms → Mozart record. */
export default function Report() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const online = useOnline();
  const mode = useApp((x) => x.settings.aiMode);
  const lang = useApp((x) => x.settings.lang);
  const dispatch = useApp((x) => x.dispatch);
  const params = useLocalSearchParams<{ clip?: string }>();
  const clips = voiceClips.filter((v) => !v.checkpoint);
  const [clipId, setClipId] = useState(params.clip ?? 'clip-gate');
  const [phase, setPhase] = useState<Phase>('capture');
  const [transcript, setTranscript] = useState('');
  const [recording, setRecording] = useState(false);
  const [typed, setTyped] = useState(false);
  const [result, setResult] = useState<(ExtractResult & { meta: { mode: string; fallback?: boolean } }) | null>(null);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [assetPicker, setAssetPicker] = useState(false);
  const [sopPicker, setSopPicker] = useState(false);
  const streamDone = useRef<Promise<string> | null>(null);
  const stopReal = useRef<null | (() => void)>(null);
  const t0 = useRef(0);
  const zones = s.sites.find((x) => x.id === me.siteId)!.zones;
  const clip = voiceClips.find((v) => v.id === clipId)!;

  function startScripted() {
    if (recording) return;
    setRecording(true);
    setTranscript('');
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    streamDone.current = (async () => {
      let last = '';
      for await (const p of getAi().transcribe(clip.transcript, { durationSec: clip.durationSec })) { last = p; setTranscript(p); }
      return last;
    })();
  }

  async function stopAndExtract() {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const real = stopReal.current;
    if (real) real();
    const text = real ? transcript : await (streamDone.current ?? Promise.resolve(transcript));
    stopReal.current = null;
    streamDone.current = null;
    setRecording(false);
    await extract(text, real ? undefined : clipId);
  }

  function startReal() {
    setRecording(true);
    setTranscript('');
    stopReal.current = startDictation(lang, setTranscript, () => setRecording(false));
  }

  async function extract(text: string, cid?: string) {
    if (!text.trim()) { setPhase('capture'); return; }
    setTranscript(text);
    setPhase('extracting');
    t0.current = Date.now();
    const r = await getAi().extractReport({ transcript: text, clipId: cid, officerId: me.id, officerZoneId: me.zoneId, ctx: { siteId: me.siteId, sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs } });
    setResult(r);
    setDraft({ ...r.draft });
    setChecked(new Set());
    setPhase('review');
  }

  const conf = (k: DraftField) => result?.confidence[k];
  const needsCheck = (k: DraftField) => (conf(k) ?? 1) < 0.7 && (draft?.[k] ?? null) !== null && !checked.has(k);
  const missing = (k: DraftField) => REQUIRED.includes(k) && !draft?.[k];
  const set = <K extends keyof ReportDraft>(k: K, v: ReportDraft[K]) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    setChecked((x) => new Set(x).add(k));
  };
  const blockers = draft ? (Object.keys(draft) as DraftField[]).filter((k) => needsCheck(k) || missing(k)) : [];

  function submit() {
    if (!draft || !result) return;
    const isWo = draft.type === 'corrective_wo' || draft.type === 'hazard';
    const recordId = newRecordNumber(isWo ? 'CWO' : 'INC');
    const r = dispatch({
      type: 'report.confirm', recordId, draft, attachments: photos,
      report: {
        id: newId('VR'), officerId: me.id, siteId: me.siteId, clipId, transcript, extractedDraft: result.draft, confidence: result.confidence,
        syncStatus: online ? 'synced' : 'pending', createdAt: new Date().toISOString(), draft: true,
      },
    }, { confirm: true });
    if (!r.ok) return;
    useApp.getState().toast({ kind: 'success', title: online ? `Submitted ${recordId}` : `Saved offline · ${recordId}`, body: online ? 'Written to Mozart after your confirmation.' : 'Pending sync. It will reach Mozart when you reconnect.' });
    router.replace(isWo ? '/tasks' : '/home');
  }

  const header = <Header title="Voice report" subtitle="AI drafts, you confirm, Mozart records" back right={<View style={{ paddingRight: 8 }}><ModeBadge mode={result?.meta.mode ?? mode} fallback={result?.meta.fallback} /></View>} />;

  if (phase === 'capture') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {header}
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 60 }}>
          <View style={{ minHeight: 150, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: recording ? c.primary : c.border, padding: space.lg, gap: 8 }}>
            <Row>
              {recording ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.fail }} /> : <Icon name="chatbox-ellipses-outline" size={18} color={c.textMuted} />}
              <Txt v="label">{recording ? 'Listening… release to finish' : 'Live transcript'}</Txt>
            </Row>
            {typed ? (
              <Field label="Type your report" value={transcript} onChangeText={setTranscript} multiline placeholder="What happened, where, and how serious?" />
            ) : (
              <Txt v="body" style={{ fontSize: 18, lineHeight: 27 }}>{transcript || 'Hold the button and describe what you see: what, where, how serious.'}</Txt>
            )}
          </View>

          {!typed ? (
            <View style={{ alignItems: 'center', gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hold to talk"
                onPressIn={speechSupported() && clipId === 'real' ? startReal : startScripted}
                onPressOut={() => void stopAndExtract()}
                style={({ pressed }) => ({
                  width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: recording || pressed ? c.fail : c.primary, transform: [{ scale: recording ? 1.06 : 1 }],
                  shadowColor: recording ? c.fail : c.primary, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12,
                })}
              >
                <Icon name="mic" size={60} color="#fff" />
              </Pressable>
              <Txt v="bodyStrong">{recording ? 'Release to send' : 'Hold to talk'}</Txt>
            </View>
          ) : (
            <Button size="lg" icon="sparkles-outline" label="Draft report" disabled={!transcript.trim()} onPress={() => void extract(transcript)} />
          )}

          <View style={{ gap: 8 }}>
            <Txt v="label">Demo voice clip</Txt>
            <Row wrap>
              {clips.map((v) => <Chip key={v.id} label={v.label} selected={clipId === v.id && !typed} onPress={() => { setClipId(v.id); setTyped(false); setTranscript(''); }} />)}
              {speechSupported() ? <Chip icon="mic-circle-outline" label="My voice (browser STT)" selected={clipId === 'real'} onPress={() => { setClipId('real'); setTyped(false); }} /> : null}
              <Chip icon="create-outline" label="Type instead" selected={typed} onPress={() => setTyped(true)} />
            </Row>
            <Txt v="caption">Scripted clips stand in for recorded audio in DEMO mode. In LIVE mode audio streams to Gemini Live (Chirp 3 fallback).</Txt>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (phase === 'extracting') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {header}
        <View style={{ padding: space.lg, gap: space.lg }}>
          <Txt v="small" style={{ fontStyle: 'italic' }}>“{transcript}”</Txt>
          <Row><ActivityIndicator color={c.primary} /><Txt v="bodyStrong">Extracting type, location, asset, severity, SOP…</Txt></Row>
          {[0, 1, 2, 3].map((i) => <View key={i} style={{ height: 44, borderRadius: 10, backgroundColor: c.surfaceAlt, opacity: 0.6 - i * 0.1 }} />)}
        </View>
      </View>
    );
  }

  // review
  const d = draft!;
  const asset = s.assets.find((a) => a.id === d.assetId);
  const sop = s.sops.find((x) => x.id === d.recommendedSopId);
  const fieldHint = (k: DraftField) => (missing(k) ? 'Required' : needsCheck(k) ? 'Low confidence: check' : undefined);
  const ConfirmBtn = ({ k }: { k: DraftField }) => (needsCheck(k) ? <Button size="sm" kind="secondary" icon="checkmark" label="Looks right" onPress={() => setChecked((x) => new Set(x).add(k))} /> : null);
  const Label = ({ k, title }: { k: DraftField; title: string }) => (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt v="small" color={missing(k) ? c.fail : needsCheck(k) ? c.attention : c.textMuted} style={{ fontWeight: '700' }}>{title}{fieldHint(k) ? ` · ${fieldHint(k)}` : ''}</Txt>
      <ConfidenceTag value={conf(k)} />
    </Row>
  );
  const box = (k: DraftField) => ({ gap: 8, padding: space.md, borderRadius: radius.md, borderWidth: missing(k) || needsCheck(k) ? 2 : 1, borderColor: missing(k) ? c.fail : needsCheck(k) ? c.attention : c.border, backgroundColor: c.surface });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header}
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Row wrap>
          <Pill tone="pass" icon="sparkles" label={`Draft ready in ${((result?.latencyMs ?? 0) / 1000).toFixed(1)} s`} />
          <Pill tone="muted" label={result?.model ?? ''} />
        </Row>
        <Txt v="small" style={{ fontStyle: 'italic' }}>“{transcript}”</Txt>

        <View style={box('type')}>
          <Label k="type" title="Type" />
          <Row wrap>{TYPES.map(([k, l]) => <Chip key={k} label={l} selected={d.type === k} onPress={() => set('type', k)} />)}</Row>
          <ConfirmBtn k="type" />
        </View>

        <Field label={`Title${conf('title') !== undefined && conf('title')! < 0.7 ? ' · check' : ''}`} value={d.title ?? ''} onChangeText={(v) => set('title', v)} />

        <View style={box('zoneId')}>
          <Label k="zoneId" title="Location" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {zones.map((z) => <Chip key={z.id} label={z.name} selected={d.zoneId === z.id} onPress={() => { set('zoneId', z.id); set('location', z.name); }} />)}
          </ScrollView>
          <Field label="Exact spot" value={d.location ?? ''} onChangeText={(v) => set('location', v)} placeholder="e.g. outside #03-32" />
          <ConfirmBtn k="zoneId" />
        </View>

        <View style={box('assetId')}>
          <Label k="assetId" title="Asset" />
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="bodyStrong" style={{ flex: 1 }}>{asset ? `${asset.name}` : 'None'}</Txt>
            <Button size="sm" kind="ghost" label={assetPicker ? 'Done' : 'Change'} onPress={() => setAssetPicker((x) => !x)} />
          </Row>
          {asset ? <Txt v="caption">Tag {asset.tag}</Txt> : null}
          {assetPicker ? (
            <Row wrap>
              <Chip label="No asset" selected={!d.assetId} onPress={() => set('assetId', null)} />
              {s.assets.filter((a) => a.siteId === me.siteId && (!d.zoneId || a.zoneId === d.zoneId)).slice(0, 14).map((a) => (
                <Chip key={a.id} label={a.name} selected={d.assetId === a.id} onPress={() => { set('assetId', a.id); setAssetPicker(false); }} />
              ))}
            </Row>
          ) : null}
          <ConfirmBtn k="assetId" />
        </View>

        <View style={box('severity')}>
          <Label k="severity" title="Severity" />
          <Row wrap>{SEVS.map((v) => <Chip key={v} label={v[0].toUpperCase() + v.slice(1)} selected={d.severity === v} onPress={() => set('severity', v)} />)}</Row>
          <ConfirmBtn k="severity" />
        </View>

        <View style={box('description')}>
          <Label k="description" title="Description" />
          <Field label="" value={d.description ?? ''} onChangeText={(v) => set('description', v)} multiline />
        </View>

        <View style={box('recommendedSopId')}>
          <Label k="recommendedSopId" title="Recommended SOP" />
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable style={{ flex: 1 }} onPress={() => sop && router.push(`/doc/${sop.id}`)}>
              <Txt v="bodyStrong" color={sop ? c.primary : undefined}>{sop ? `${sop.code} ${sop.title}` : 'None'}</Txt>
            </Pressable>
            <Button size="sm" kind="ghost" label={sopPicker ? 'Done' : 'Change'} onPress={() => setSopPicker((x) => !x)} />
          </Row>
          {sopPicker ? <Row wrap>{s.sops.map((x) => <Chip key={x.id} label={x.code} selected={d.recommendedSopId === x.id} onPress={() => { set('recommendedSopId', x.id); setSopPicker(false); }} />)}</Row> : null}
          <ConfirmBtn k="recommendedSopId" />
        </View>

        <View style={{ gap: 8 }}>
          <Txt v="label">Photo</Txt>
          <AttachmentStrip items={photos} />
          <PhotoPicker assetId={d.assetId} onPick={(a) => setPhotos((p) => [...p, a])} />
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border, gap: 6 }}>
        {blockers.length ? <Txt v="caption" color={c.attention}>{blockers.length} field{blockers.length > 1 ? 's' : ''} need{blockers.length > 1 ? '' : 's'} your check before submitting. Nothing is guessed silently.</Txt> : null}
        <Row>
          <Button kind="ghost" label="Re-record" icon="refresh" onPress={() => { setPhase('capture'); setTranscript(''); }} />
          <Button style={{ flex: 1 }} size="lg" icon={online ? 'send' : 'cloud-offline-outline'} label={online ? 'Submit to Mozart' : 'Save offline'} disabled={blockers.length > 0} onPress={submit} />
        </Row>
      </View>
    </View>
  );
}
