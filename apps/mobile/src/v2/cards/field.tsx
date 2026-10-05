import { newId, newRecordNumber } from '@mozart/actions';
import { fixtureImages, frictionClips, voiceClips } from '@mozart/fixtures';
import type { Attachment, DraftField, ExtractResult, FrictionCategory, HandoverSection, ReportDraft, ReportType, Severity, Verdict, VerifyResult } from '@mozart/schema';
import { v2 } from '@mozart/ui';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SceneImage } from '@/components/media';
import { shiftStart } from '@/lib/format';
import { useMe, useOnline, useView } from '@/lib/hooks';
import { speechSupported, startDictation } from '@/lib/speech';
import { getAi, useApp } from '@/store/app';
import { useChat } from '../chatStore';
import { usePanel } from '../panels';
import { PhotoButton } from '../photo';
import { Badge, Btn, Chip, Col, Field, Icon, Row, Surface, T, useV2 } from '../ui';
import type { CardProps } from './core';

const ctxOf = (s: ReturnType<typeof useView>, siteId: string) => ({ siteId, sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs });

function Done({ label, id, wo }: { label: string; id?: string; wo?: boolean }) {
  const open = usePanel((x) => x.open);
  return (
    <Surface tone="pass" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icon name="checkmark-circle" color={useV2().pass} />
      <T v="smallStrong" style={{ flex: 1 }}>{label}</T>
      {wo && id ? <Btn size="sm" kind="ghost" label="Open" onPress={() => open({ kind: 'wo', id })} /> : null}
    </Surface>
  );
}

// ------------------------------------------------------------ report

const TYPES: [ReportType, string][] = [['corrective_wo', 'Work order'], ['incident', 'Incident'], ['hazard', 'Hazard'], ['observation', 'Observation']];
const SEVS: Severity[] = ['low', 'medium', 'high', 'critical'];
const REQUIRED: DraftField[] = ['type', 'zoneId', 'description'];

export function ReportCard({ threadId, msg }: CardProps) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const online = useOnline();
  const lang = useApp((x) => x.settings.lang);
  const dispatch = useApp((x) => x.dispatch);
  const d = (msg.data ?? {}) as { utterance?: string; clipId?: string; recordId?: string; isWo?: boolean };
  const descriptive = (d.utterance ?? '').split(/\s+/).length >= 6 && !/^\s*report\b/i.test(d.utterance ?? '');
  const [clipId, setClipId] = useState(d.clipId ?? 'clip-gate');
  const [phase, setPhase] = useState<'capture' | 'extracting' | 'review'>(descriptive ? 'extracting' : 'capture');
  const [transcript, setTranscript] = useState(descriptive ? d.utterance! : '');
  const [recording, setRecording] = useState(false);
  const [res, setRes] = useState<(ExtractResult & { meta: { mode: string; fallback?: boolean } }) | null>(null);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const stopReal = useRef<null | (() => void)>(null);
  const stream = useRef<Promise<string> | null>(null);
  const zones = s.sites.find((x) => x.id === me.siteId)?.zones ?? [];

  useEffect(() => { if (descriptive && !d.recordId) void extract(d.utterance!); }, []);
  if (d.recordId) return <Done label={`Submitted ${d.recordId}`} id={d.recordId} wo={d.isWo} />;

  async function extract(text: string, cid?: string) {
    setTranscript(text);
    setPhase('extracting');
    const r = await getAi().extractReport({ transcript: text, clipId: cid, officerId: me.id, officerZoneId: me.zoneId, ctx: ctxOf(s, me.siteId) });
    setRes(r);
    setDraft({ ...r.draft });
    setPhase('review');
  }
  function start() {
    if (recording) return;
    setRecording(true);
    setTranscript('');
    if (clipId === 'real') { stopReal.current = startDictation(lang, setTranscript, () => setRecording(false)); return; }
    const clip = voiceClips.find((v) => v.id === clipId)!;
    stream.current = (async () => { let last = ''; for await (const p of getAi().transcribe(clip.transcript, { durationSec: clip.durationSec })) { last = p; setTranscript(p); } return last; })();
  }
  async function stop() {
    const real = stopReal.current;
    if (real) real();
    const text = real ? transcript : await (stream.current ?? Promise.resolve(transcript));
    stopReal.current = null; stream.current = null; setRecording(false);
    if (text.trim()) await extract(text, real ? undefined : clipId);
  }

  if (phase === 'capture') {
    return (
      <Surface style={{ gap: 14 }}>
        <View style={{ minHeight: 72, borderRadius: 14, backgroundColor: c.sunken, padding: 14 }}>
          <T v={transcript ? 'body' : 'small'} color={transcript ? c.text : c.textMuted}>{transcript || 'Hold the mic and say what, where and how serious.'}</T>
        </View>
        <Row gap={14}>
          <Pressable accessibilityRole="button" accessibilityLabel="Hold to talk" onPressIn={start} onPressOut={() => void stop()}
            style={({ pressed }) => ({ width: 64, height: 64, borderRadius: 32, backgroundColor: recording || pressed ? c.fail : c.orange, alignItems: 'center', justifyContent: 'center', transform: [{ scale: recording ? 1.08 : 1 }] })}>
            <Icon name="mic" size={30} color="#fff" />
          </Pressable>
          <Col gap={2} style={{ flex: 1 }}>
            <T v="smallStrong">{recording ? 'Listening… release to draft' : 'Hold to talk'}</T>
            <T v="caption">Or pick a demo clip below</T>
          </Col>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {voiceClips.filter((v) => !v.checkpoint).map((v) => <Chip key={v.id} label={v.label} selected={clipId === v.id} onPress={() => setClipId(v.id)} />)}
          {speechSupported() ? <Chip icon="mic-circle-outline" label="My voice" selected={clipId === 'real'} onPress={() => setClipId('real')} /> : null}
        </ScrollView>
      </Surface>
    );
  }
  if (phase === 'extracting' || !draft || !res) {
    return <Surface><Row><ActivityIndicator color={c.orange} /><T v="small">Reading the report: type, place, asset, severity, SOP…</T></Row></Surface>;
  }

  const conf = (k: DraftField) => res.confidence[k];
  const needs = (k: DraftField) => (conf(k) ?? 1) < 0.7 && draft[k] !== null && !checked.has(k);
  const missing = (k: DraftField) => REQUIRED.includes(k) && !draft[k];
  const set = <K extends keyof ReportDraft>(k: K, v: ReportDraft[K]) => { setDraft({ ...draft, [k]: v }); setChecked(new Set(checked).add(k)); };
  const blockers = (Object.keys(draft) as DraftField[]).filter((k) => needs(k) || missing(k));
  const asset = s.assets.find((a) => a.id === draft.assetId);
  const sop = s.sops.find((x) => x.id === draft.recommendedSopId);

  const FieldRow = ({ k, title, children }: { k: DraftField; title: string; children: React.ReactNode }) => (
    <View style={{ gap: 6, padding: 12, borderRadius: 14, backgroundColor: needs(k) ? c.warnSoft : missing(k) ? c.failSoft : c.sunken }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="label" color={needs(k) ? c.warn : missing(k) ? c.fail : c.textMuted}>{title}{needs(k) ? ' · check this' : missing(k) ? ' · required' : ''}</T>
        <T v="caption" color={(conf(k) ?? 1) < 0.7 ? c.warn : c.textFaint}>{conf(k) === 0 ? 'not inferred' : conf(k) !== undefined ? `${Math.round(conf(k)! * 100)}%` : ''}</T>
      </Row>
      {children}
      {needs(k) ? <Row><Btn size="sm" kind="ghost" icon="checkmark" label="Looks right" onPress={() => setChecked(new Set(checked).add(k))} /></Row> : null}
    </View>
  );

  return (
    <Surface style={{ gap: 10 }}>
      <Row wrap><Badge tone="pass" icon="sparkles" label={`Draft in ${(res.latencyMs / 1000).toFixed(1)} s`} />{res.meta.fallback ? <Badge tone="warn" label="LIVE failed · DEMO draft" /> : null}</Row>
      <T v="small" style={{ fontStyle: 'italic' }}>“{transcript}”</T>
      <FieldRow k="type" title="Type"><Row wrap gap={6}>{TYPES.map(([k, l]) => <Chip key={k} label={l} selected={draft.type === k} onPress={() => set('type', k)} />)}</Row></FieldRow>
      <Field label="Title" value={draft.title ?? ''} onChangeText={(v) => set('title', v)} />
      <FieldRow k="zoneId" title="Location">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {zones.map((z) => <Chip key={z.id} label={z.name} selected={draft.zoneId === z.id} onPress={() => { setDraft({ ...draft, zoneId: z.id, location: z.name }); setChecked(new Set(checked).add('zoneId').add('location')); }} />)}
        </ScrollView>
      </FieldRow>
      <FieldRow k="assetId" title="Asset"><T v="smallStrong">{asset ? `${asset.name} · ${asset.tag}` : 'None'}</T></FieldRow>
      <FieldRow k="severity" title="Severity"><Row wrap gap={6}>{SEVS.map((v) => <Chip key={v} label={v[0].toUpperCase() + v.slice(1)} selected={draft.severity === v} onPress={() => set('severity', v)} />)}</Row></FieldRow>
      <Field label="Description" value={draft.description ?? ''} onChangeText={(v) => set('description', v)} multiline />
      {sop ? <Pressable onPress={() => usePanel.getState().open({ kind: 'doc', id: sop.id })}><T v="small">Recommended SOP: <Text style={{ color: c.orange, fontFamily: v2.font.semibold }}>{sop.code} {sop.title}</Text></T></Pressable> : null}
      <Row wrap gap={6}>{photos.map((p) => <View key={p.id} style={{ width: 80 }}><SceneImage uri={p.uri} height={60} /></View>)}</Row>
      <PhotoButton assetId={draft.assetId} onPick={(a) => setPhotos((p) => [...p, a])} />
      {blockers.length ? <T v="caption" color={c.warn}>{blockers.length} field{blockers.length > 1 ? 's' : ''} to check before submitting. Nothing is guessed silently.</T> : null}
      <Btn size="lg" icon={online ? 'send' : 'cloud-offline-outline'} label={online ? 'Submit to Mozart' : 'Save offline'} disabled={blockers.length > 0}
        onPress={() => {
          const isWo = draft.type === 'corrective_wo' || draft.type === 'hazard';
          const recordId = newRecordNumber(isWo ? 'CWO' : 'INC');
          const r = dispatch({ type: 'report.confirm', recordId, draft, attachments: photos, report: { id: newId('VR'), officerId: me.id, siteId: me.siteId, clipId, transcript, extractedDraft: res.draft, confidence: res.confidence, syncStatus: online ? 'synced' : 'pending', createdAt: new Date().toISOString(), draft: true } }, { confirm: true });
          if (r.ok) useChat.getState().patchData(threadId, msg.id, { recordId, isWo });
        }} />
    </Surface>
  );
}

// ------------------------------------------------------------ verify

export function VerifyCard({ threadId, msg }: CardProps) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const d = (msg.data ?? {}) as { verificationId?: string; woId?: string; verdict?: Verdict };
  const targets = s.workOrders.filter((w) => w.assigneeId === me.id && !['closed', 'pending_approval'].includes(w.status) && w.steps.some((st) => st.expectedState && !st.verificationId));
  const [woId, setWoId] = useState<string | undefined>(targets[0]?.id);
  const wo = s.workOrders.find((w) => w.id === woId);
  const [scene, setScene] = useState(`fixture://${(fixtureImages.find((f) => f.assetId === wo?.assetId) ?? fixtureImages[0]).id}`);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<(VerifyResult & { meta: { mode: string; fallback?: boolean } }) | null>(null);
  if (d.verificationId) return <Done label={`${(d.verdict ?? '').toUpperCase()} attached${d.woId ? ` to ${d.woId}` : ''}`} id={d.woId} wo={!!d.woId} />;
  const col = r ? (r.verdict === 'pass' ? c.pass : r.verdict === 'fail' ? c.fail : c.warn) : c.border;
  return (
    <Surface style={{ gap: 12 }}>
      {targets.length ? (
        <Row wrap gap={6}><T v="caption">For</T>{targets.map((w) => <Chip key={w.id} label={w.title.split(':')[0]} selected={woId === w.id} onPress={() => { setWoId(w.id); setR(null); const f = fixtureImages.find((x) => x.assetId === w.assetId); if (f) setScene(`fixture://${f.id}`); }} />)}</Row>
      ) : null}
      <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: col }}>
        <SceneImage uri={scene} height={240} style={{ borderRadius: 0 }} />
        {busy ? <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10, padding: 8, borderRadius: 10, backgroundColor: 'rgba(11,31,58,0.75)' }}><T v="caption" color="#fff">Checking against the SOP’s expected state…</T></View> : null}
      </View>
      {!r ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {fixtureImages.map((f) => (
              <Pressable key={f.id} onPress={() => setScene(`fixture://${f.id}`)} style={{ width: 72 }} accessibilityLabel={f.label}>
                <SceneImage uri={`fixture://${f.id}`} height={56} style={{ borderWidth: 2, borderColor: scene.endsWith(f.id) ? c.orange : 'transparent' }} />
              </Pressable>
            ))}
          </ScrollView>
          <Btn size="lg" icon="scan" label="Check it" loading={busy} onPress={async () => {
            setBusy(true);
            setR(await getAi().verify({ imageUri: scene, assetId: wo?.assetId, attempt: 1, officerId: me.id, ctx: ctxOf(s, me.siteId) }));
            setBusy(false);
          }} />
        </>
      ) : (
        <Col gap={10}>
          <Row gap={10}>
            <Icon name={r.verdict === 'pass' ? 'checkmark-circle' : r.verdict === 'fail' ? 'close-circle' : 'alert-circle'} size={28} color={col} />
            <T v="title" color={col}>{r.verdict === 'pass' ? 'Pass' : r.verdict === 'fail' ? 'Fail' : 'Attention'}</T>
            <T v="caption" style={{ marginLeft: 'auto' }}>{Math.round(r.confidence * 100)}% · {(r.latencyMs / 1000).toFixed(1)} s</T>
          </Row>
          <T v="small" color={c.text}>{r.reason}</T>
          {r.observed.map((o) => <Row key={o.indicator} gap={8}><Icon name={o.ok ? 'checkmark' : 'close'} size={16} color={o.ok ? c.pass : c.fail} /><T v="caption" style={{ flex: 1 }}><Text style={{ color: c.text, fontFamily: v2.font.semibold }}>{o.indicator}</Text> · expected {o.expected}, seen {o.observed}</T></Row>)}
          {r.nextStep ? <Surface tone="info" style={{ gap: 2 }}><T v="label" color={c.info}>Next step · {r.nextStep.sopId} step {r.nextStep.n}</T><T v="small" color={c.text}>{r.nextStep.text}</T></Surface> : null}
          {r.lowConfidence ? <Badge tone="warn" label="Low confidence: take a second photo" /> : null}
          <Row wrap>
            <Btn icon="attach" label={wo ? `Attach to ${wo.id}` : 'Save check'} onPress={() => {
              const step = wo?.steps.find((st) => st.expectedState && !st.verificationId);
              const v = { id: newId('VER'), officerId: me.id, siteId: me.siteId, workOrderId: wo?.id, stepId: step?.id, assetId: r.assetId, imageUri: scene, verdict: r.verdict, reason: r.reason, observed: r.observed, nextStep: r.nextStep, confidence: r.confidence, createdAt: new Date().toISOString() };
              const ok = dispatch({ type: 'verification.record', verification: v });
              if (ok.ok) useChat.getState().patchData(threadId, msg.id, { verificationId: v.id, woId: wo?.id, verdict: r.verdict });
            }} />
            <Btn kind="ghost" icon="refresh" label="Retake" onPress={() => setR(null)} />
          </Row>
        </Col>
      )}
    </Surface>
  );
}

// ------------------------------------------------------------ handover

export function HandoverCard({ threadId, msg }: CardProps) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const d = (msg.data ?? {}) as { handoverId?: string };
  const incoming = s.officers.filter((o) => o.siteId === me.siteId && o.role === 'officer' && o.shiftId !== me.shiftId);
  const [inId, setInId] = useState(incoming[0]?.id ?? 'o-arun');
  const [draft, setDraft] = useState<{ headline: string; sections: HandoverSection[]; latencyMs: number } | null>(null);
  const [busy, setBusy] = useState(false);
  if (d.handoverId) return <Done label={`Handover signed and sent to ${s.officers.find((o) => o.id === inId)?.name ?? 'the next shift'}`} />;
  return (
    <Surface style={{ gap: 12 }}>
      <Row wrap gap={6}><T v="caption">Handing over to</T>{incoming.map((o) => <Chip key={o.id} label={o.name} selected={inId === o.id} onPress={() => setInId(o.id)} />)}</Row>
      {!draft ? (
        <Btn size="lg" icon="sparkles" label={busy ? 'Drafting from your shift…' : 'Draft my handover'} loading={busy} onPress={async () => {
          setBusy(true);
          const r = await getAi().generateHandover({ officerId: me.id, officer: me, shiftStart: shiftStart(s), workOrders: s.workOrders, incidents: s.incidents, alarms: s.alarms, voiceReports: s.voiceReports, verifications: s.verifications, frictionLogs: s.frictionLogs, tours: s.tours, ctx: ctxOf(s, me.siteId) });
          setDraft({ headline: r.headline, sections: r.sections, latencyMs: r.latencyMs });
          setBusy(false);
        }} />
      ) : (
        <Col gap={10}>
          <Badge tone="pass" icon="sparkles" label={`Drafted in ${(draft.latencyMs / 1000).toFixed(1)} s · every line links to its record`} />
          <T v="bodyStrong">{draft.headline}</T>
          {draft.sections.map((sec) => (
            <Col key={sec.id} gap={4}>
              <T v="label">{sec.title}</T>
              {sec.items.map((it) => (
                <Row key={it.id} align="flex-start" gap={8}>
                  <T v="small" color={c.textFaint}>•</T>
                  <T v="small" color={c.text} style={{ flex: 1 }}>{it.text} {it.sourceRefs.filter((r) => r.kind === 'workOrder').map((r) => (
                    <Text key={r.id} onPress={() => usePanel.getState().open({ kind: 'wo', id: r.id })} style={{ color: c.orange, fontFamily: v2.font.semibold }}> {r.id}</Text>
                  ))}</T>
                </Row>
              ))}
            </Col>
          ))}
          <Btn size="lg" icon="create-outline" label="Sign and send" onPress={() => {
            const id = newId('HND');
            const r = dispatch({ type: 'handover.sign', handover: { id, siteId: me.siteId, shiftId: me.shiftId, outgoingId: me.id, incomingId: inId, headline: draft.headline, summary: draft.sections, notes: '', signature: `tap:${me.name}@${new Date().toISOString()}`, createdAt: new Date().toISOString() } }, { confirm: true });
            if (r.ok) useChat.getState().patchData(threadId, msg.id, { handoverId: id });
          }} />
        </Col>
      )}
    </Surface>
  );
}

// ------------------------------------------------------------ friction

const CATS: [FrictionCategory, string][] = [['sop', 'SOP step'], ['equipment', 'Equipment'], ['access', 'Access'], ['tooling', 'App / tooling'], ['safety', 'Safety']];

export function FrictionCard({ threadId, msg }: CardProps) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const d = (msg.data ?? {}) as { utterance?: string; logId?: string };
  const [cat, setCat] = useState<FrictionCategory | null>(null);
  const [text, setText] = useState('');
  const [ref, setRef] = useState<{ sopId: string; n: number } | undefined>();
  const [assetId, setAssetId] = useState<string | undefined>();
  if (d.logId) {
    const log = s.frictionLogs.find((f) => f.id === d.logId);
    return <Done label={`Sent to your supervisor · ${log?.status.replace('_', ' ') ?? 'received'}`} />;
  }
  return (
    <Surface style={{ gap: 12 }}>
      <Row wrap gap={6}>{CATS.map(([k, l]) => <Chip key={k} label={l} selected={cat === k} onPress={() => setCat(k)} />)}</Row>
      <Field value={text} onChangeText={setText} placeholder="What doesn’t work? (optional)" multiline />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {frictionClips.map((f) => <Chip key={f.id} icon="mic-outline" label={f.text.slice(0, 34) + '…'} onPress={async () => {
          setCat(f.category); setRef(f.sopStepRef); setAssetId(f.assetId);
          for await (const p of getAi().transcribe(f.text, { durationSec: 4 })) setText(p);
        }} />)}
      </ScrollView>
      {ref ? <Badge tone="navy" label={`${ref.sopId} step ${ref.n}`} /> : null}
      <Btn size="lg" icon="send" label="Send" disabled={!cat} onPress={() => {
        const log = { id: newId('FL'), officerId: me.id, officerName: me.name, siteId: me.siteId, category: cat!, text: text.trim() || `(${cat} issue)`, assetId, sopStepRef: ref, attachments: [], status: 'received' as const, routedTo: 'supervisor' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const r = dispatch({ type: 'friction.file', log });
        if (r.ok) useChat.getState().patchData(threadId, msg.id, { logId: log.id });
      }} />
      <T v="caption" color={c.textFaint}>Your supervisor sees it now; HQ sees it if it’s forwarded. You’ll get the decision here.</T>
    </Surface>
  );
}
