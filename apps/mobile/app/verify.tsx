import { newId } from '@mozart/actions';
import { fixtureImages } from '@mozart/fixtures';
import type { Verdict, Verification, VerifyResult } from '@mozart/schema';
import { space, radius } from '@mozart/ui';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { takePhoto } from '@/components/attach';
import { SceneImage } from '@/components/media';
import { Button, Card, Chip, Field, Header, Icon, ModeBadge, Pill, Row, Txt } from '@/components/ui';
import { useMe, useView } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { getAi, useApp } from '@/store/app';

type R = VerifyResult & { meta: { mode: string; fallback?: boolean } };

/** F4 Visual SOP Verification: camera on panel/gate/meter → Pass / Attention / Fail + next SOP step. */
export default function Verify() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const mode = useApp((x) => x.settings.aiMode);
  const p = useLocalSearchParams<{ woId?: string; stepId?: string; assetId?: string; checkpointId?: string; verificationId?: string }>();
  const existing = p.verificationId ? s.verifications.find((v) => v.id === p.verificationId) : undefined;
  const wo = s.workOrders.find((w) => w.id === (p.woId || existing?.workOrderId));
  const presetAsset = p.assetId || wo?.assetId || undefined;
  const firstScene = fixtureImages.find((f) => f.assetId === presetAsset) ?? fixtureImages[0];
  const [scene, setScene] = useState<string>(existing?.imageUri ?? `fixture://${firstScene.id}`);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const [result, setResult] = useState<R | null>(null);
  const [override, setOverride] = useState<Verdict | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState('');

  const sceneFx = scene.startsWith('fixture://') ? fixtureImages.find((f) => f.id === scene.slice(10)) : undefined;
  const overlayAsset = s.assets.find((a) => a.id === (result?.assetId ?? (sceneFx?.qr ? sceneFx.assetId : presetAsset)));

  async function analyse(uri = scene) {
    setBusy(true);
    setResult(null);
    setOverride(null);
    const r = await getAi().verify({ imageUri: uri, assetId: presetAsset, attempt, officerId: me.id, ctx: { siteId: me.siteId, sites: s.sites, assets: s.assets, sops: s.sops, docs: s.docs } });
    setResult(r);
    setBusy(false);
  }

  function save() {
    if (!result) return;
    const v: Verification = {
      id: newId('VER'), officerId: me.id, siteId: me.siteId, workOrderId: wo?.id, stepId: p.stepId || undefined, checkpointId: p.checkpointId || undefined,
      assetId: result.assetId, imageUri: scene, verdict: result.verdict, reason: result.reason, observed: result.observed, nextStep: result.nextStep,
      confidence: result.confidence, override: override ?? undefined, overrideReason: override ? reason : undefined, createdAt: new Date().toISOString(),
    };
    const r = dispatch({ type: 'verification.record', verification: v });
    if (override && r.ok) dispatch({ type: 'audit.ai', entry: { kind: 'override', feature: 'verify', officerId: me.id, recordId: v.id, detail: `${result.verdict} → ${override}: ${reason}` } }, { quiet: true });
    if (r.ok) {
      useApp.getState().toast({ kind: 'success', title: wo ? `Attached to ${wo.id}` : 'Verification saved', body: `${(override ?? result.verdict).toUpperCase()}: ${result.reason.slice(0, 80)}` });
      router.back();
    }
  }

  // Viewing a saved verification
  if (existing) {
    const verdict = existing.override ?? existing.verdict;
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header title="Verification" subtitle={s.assets.find((a) => a.id === existing.assetId)?.name} back />
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
          <SceneImage uri={existing.imageUri} height={300} />
          <VerdictCard verdict={verdict} reason={existing.reason} observed={existing.observed} nextStep={existing.nextStep} confidence={existing.confidence} />
          {existing.override ? <Card tone="attention"><Txt v="bodyStrong">Officer override: {existing.override.toUpperCase()}</Txt><Txt v="small">{existing.overrideReason}</Txt></Card> : null}
          {existing.officerId === me.id && !existing.override ? (
            <OverridePanel original={existing.verdict} onSubmit={(v, why) => { dispatch({ type: 'verification.override', verificationId: existing.id, verdict: v, reason: why }); router.back(); }} />
          ) : null}
        </ScrollView>
      </View>
    );
  }

  const tone = result ? (override ?? result.verdict) : null;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Verify with camera" subtitle={wo ? `${wo.id} · ${wo.steps.find((x) => x.id === p.stepId)?.label ?? ''}` : 'Point at a panel, gate, meter or door'} back
        right={<View style={{ paddingRight: 8 }}><ModeBadge mode={result?.meta.mode ?? mode} fallback={result?.meta.fallback} /></View>} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 60 }}>
        {/* Viewfinder */}
        <View>
          <SceneImage uri={scene} height={330} />
          <View pointerEvents="none" style={{ position: 'absolute', top: 18, left: 18, right: 18, bottom: 18, borderWidth: 2, borderColor: tone === 'pass' ? c.pass : tone === 'fail' ? c.fail : tone === 'attention' ? c.attention : 'rgba(255,255,255,0.55)', borderRadius: 18, borderStyle: busy ? 'dashed' : 'solid' }} />
          {overlayAsset ? (
            <View style={{ position: 'absolute', left: 26, top: 26, right: 26, backgroundColor: 'rgba(3,8,16,0.75)', borderRadius: 10, padding: 8 }}>
              <Txt v="caption" color="#fff" style={{ fontWeight: '800' }}>{result?.identifiedBy === 'visual' ? 'VISUAL MATCH' : 'QR'} · {overlayAsset.tag}</Txt>
              <Txt v="caption" color="#DDE6F2">{overlayAsset.name}</Txt>
            </View>
          ) : null}
          {busy ? (
            <View style={{ position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'rgba(3,8,16,0.8)', padding: 10, borderRadius: 20 }}>
                <ActivityIndicator color="#fff" />
                <Txt v="small" color="#fff">Checking against SOP expected states…</Txt>
              </View>
            </View>
          ) : null}
        </View>

        {!result ? (
          <>
            <Row style={{ justifyContent: 'center' }} gap={24}>
              <Pressable accessibilityRole="button" accessibilityLabel="Use the phone camera" onPress={async () => { const a = await takePhoto(); if (a) { setScene(a.uri); void analyse(a.uri); } }}
                style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }}>
                <Icon name="image-outline" />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Capture and verify" onPress={() => void analyse()} disabled={busy}
                style={({ pressed }) => ({ width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: '#fff', backgroundColor: pressed ? c.primary : c.primary + 'CC', alignItems: 'center', justifyContent: 'center' })}>
                <Icon name="scan" size={34} color="#fff" />
              </Pressable>
              <View style={{ width: 56 }} />
            </Row>
            <Txt v="label">Demo: point the camera at</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {fixtureImages.map((f) => (
                <Pressable key={f.id} onPress={() => setScene(`fixture://${f.id}`)} style={{ width: 92, gap: 4 }} accessibilityLabel={f.label}>
                  <SceneImage uri={`fixture://${f.id}`} height={110} style={{ borderWidth: 2, borderColor: scene === `fixture://${f.id}` ? c.primary : 'transparent' }} />
                  <Txt v="caption" numberOfLines={2}>{f.label}</Txt>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <VerdictCard verdict={override ?? result.verdict} reason={result.reason} observed={result.observed} nextStep={result.nextStep} confidence={result.confidence} latencyMs={result.latencyMs} />
            {result.lowConfidence ? (
              <Card tone="attention">
                <View style={{ gap: 8 }}>
                  <Row><Icon name="help-circle" color={c.attention} /><Txt v="bodyStrong">Low confidence. Take a second photo.</Txt></Row>
                  <Txt v="small">Move closer, avoid glare, and keep the indicator labels in frame.</Txt>
                  <Button kind="secondary" icon="camera-reverse-outline" label="Retake" onPress={() => { setAttempt((a) => a + 1); setResult(null); if (scene === 'fixture://img-blurry') setScene('fixture://img-fp-l3-supv'); }} />
                </View>
              </Card>
            ) : null}
            {override ? <Card tone="attention"><Txt v="bodyStrong">Override: {override.toUpperCase()}</Txt><Txt v="small">{reason}</Txt></Card> : null}
            {overrideOpen ? (
              <OverridePanel original={result.verdict} onSubmit={(v, why) => { setOverride(v); setReason(why); setOverrideOpen(false); }} onCancel={() => setOverrideOpen(false)} />
            ) : null}
            <Row wrap>
              <Button style={{ flex: 1 }} size="lg" icon="attach" label={wo ? `Attach to ${wo.id}` : p.checkpointId ? 'Attach to checkpoint' : 'Save verification'} onPress={save} />
            </Row>
            <Row wrap>
              {!override && !overrideOpen ? <Button kind="ghost" icon="hand-left-outline" label="Override verdict" onPress={() => setOverrideOpen(true)} /> : null}
              <Button kind="ghost" icon="refresh" label="Retake" onPress={() => { setResult(null); setOverride(null); }} />
            </Row>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function VerdictCard({ verdict, reason, observed, nextStep, confidence, latencyMs }: {
  verdict: Verdict; reason: string; observed: VerifyResult['observed']; nextStep: VerifyResult['nextStep']; confidence: number; latencyMs?: number;
}) {
  const c = useTheme();
  const col = verdict === 'pass' ? c.pass : verdict === 'fail' ? c.fail : c.attention;
  const bg = verdict === 'pass' ? c.passBg : verdict === 'fail' ? c.failBg : c.attentionBg;
  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 2, borderColor: col, backgroundColor: bg, padding: space.lg, gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Icon name={verdict === 'pass' ? 'checkmark-circle' : verdict === 'fail' ? 'close-circle' : 'alert-circle'} size={30} color={col} />
          <Txt v="h2" color={col}>{verdict === 'pass' ? 'Pass' : verdict === 'fail' ? 'Fail' : 'Attention'}</Txt>
        </Row>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="caption">confidence {Math.round(confidence * 100)}%</Txt>
          {latencyMs !== undefined ? <Txt v="caption">{(latencyMs / 1000).toFixed(1)} s</Txt> : null}
        </View>
      </Row>
      <Txt v="body">{reason}</Txt>
      {observed.length ? (
        <View style={{ gap: 6, backgroundColor: c.surface, borderRadius: 10, padding: 10 }}>
          {observed.map((o) => (
            <Row key={o.indicator} style={{ alignItems: 'flex-start' }}>
              <Icon name={o.ok ? 'checkmark' : 'close'} size={18} color={o.ok ? c.pass : c.fail} />
              <View style={{ flex: 1 }}>
                <Txt v="small" color={c.text} style={{ fontWeight: '700' }}>{o.indicator}</Txt>
                <Txt v="caption">Expected {o.expected} · Seen {o.observed}</Txt>
              </View>
            </Row>
          ))}
        </View>
      ) : null}
      {nextStep ? (
        <Pressable onPress={() => router.push({ pathname: '/doc/[id]', params: { id: nextStep.sopId, section: `s${nextStep.n}` } })}
          style={{ backgroundColor: c.surface, borderRadius: 10, padding: 10, gap: 4, borderWidth: 1, borderColor: c.border }}>
          <Txt v="label" color={c.primary}>Next SOP step · {nextStep.sopId} step {nextStep.n}</Txt>
          <Txt v="small" color={c.text}>{nextStep.text}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function OverridePanel({ original, onSubmit, onCancel }: { original: Verdict; onSubmit: (v: Verdict, reason: string) => void; onCancel?: () => void }) {
  const [v, setV] = useState<Verdict | null>(null);
  const [why, setWhy] = useState('');
  return (
    <Card>
      <View style={{ gap: 10 }}>
        <Txt v="bodyStrong">Override the AI verdict</Txt>
        <Txt v="caption">Your reason is logged in the audit trail.</Txt>
        <Row wrap>
          {(['pass', 'attention', 'fail'] as Verdict[]).filter((x) => x !== original).map((x) => <Chip key={x} label={x.toUpperCase()} selected={v === x} onPress={() => setV(x)} />)}
        </Row>
        <Field label="Reason" value={why} onChangeText={setWhy} placeholder="e.g. Valve is confirmed open; permit PTW-26-1182 at site" multiline />
        <Row>
          <Button label="Apply override" disabled={!v || !why.trim()} onPress={() => onSubmit(v!, why.trim())} />
          {onCancel ? <Button kind="ghost" label="Cancel" onPress={onCancel} /> : null}
        </Row>
      </View>
    </Card>
  );
}
