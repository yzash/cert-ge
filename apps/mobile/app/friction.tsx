import { newId } from '@mozart/actions';
import { frictionClips } from '@mozart/fixtures';
import type { Attachment, FrictionCategory, FrictionLog } from '@mozart/schema';
import { space } from '@mozart/ui';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { AttachmentStrip, PhotoPicker } from '@/components/attach';
import { Button, Card, Chip, Field, Icon, Pill, Row, Screen, Section, Txt, type IconName } from '@/components/ui';
import { ago, STATUS_LABEL } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { speechSupported, startDictation } from '@/lib/speech';
import { useTheme } from '@/lib/theme';
import { getAi, pendingIds, useApp } from '@/store/app';

const CATS: [FrictionCategory, string, IconName][] = [
  ['equipment', 'Equipment', 'construct-outline'],
  ['sop', 'SOP step', 'list-outline'],
  ['access', 'Access', 'key-outline'],
  ['tooling', 'Tooling / app', 'phone-portrait-outline'],
  ['safety', 'Safety', 'warning-outline'],
];
const FLOW = ['received', 'under_review', 'decided', 'closed'] as const;

/** F6 Friction Log: two taps to say "this doesn't work", and see what HQ decided. */
export default function Friction() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const now = useNow(15000);
  const dispatch = useApp((x) => x.dispatch);
  const lang = useApp((x) => x.settings.lang);
  const pending = pendingIds(useApp((x) => x.outbox));
  const params = useLocalSearchParams<{ assetId?: string; sopId?: string }>();
  const opened = useRef(Date.now());
  const [cat, setCat] = useState<FrictionCategory | null>(null);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [sopId, setSopId] = useState<string | undefined>(params.sopId || undefined);
  const [stepN, setStepN] = useState<number | undefined>(undefined);
  const [assetId, setAssetId] = useState<string | undefined>(params.assetId || undefined);
  const [listening, setListening] = useState<null | (() => void)>(null);
  const mine = s.frictionLogs.filter((f) => f.officerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sop = s.sops.find((x) => x.id === sopId);

  async function sayScripted(i: number) {
    const clip = frictionClips[i];
    setCat(clip.category);
    if (clip.sopStepRef) { setSopId(clip.sopStepRef.sopId); setStepN(clip.sopStepRef.n); }
    if (clip.assetId) setAssetId(clip.assetId);
    for await (const p of getAi().transcribe(clip.text, { durationSec: 4 })) setText(p);
  }

  function send() {
    if (!cat) return;
    const log: FrictionLog = {
      id: newId('FL'), officerId: me.id, officerName: me.name, siteId: me.siteId, category: cat, text: text.trim() || `(${cat} issue, no details)`,
      assetId, sopStepRef: sopId && stepN ? { sopId, n: stepN } : undefined, attachments: photos, status: 'received', routedTo: 'supervisor',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const r = dispatch({ type: 'friction.file', log });
    if (r.ok) {
      const secs = Math.round((Date.now() - opened.current) / 1000);
      useApp.getState().toast({ kind: 'success', title: 'Friction log filed', body: `Sent to your supervisor in ${secs} s. You’ll get a push when its status changes.` });
      setCat(null); setText(''); setPhotos([]); setStepN(undefined);
      opened.current = Date.now();
    }
  }

  return (
    <Screen title="Flag a problem" subtitle="Equipment, SOP steps, access, tooling or safety" back>
      <Section title="1 · What kind of problem?">
        <Row wrap>{CATS.map(([k, l, ic]) => <Chip key={k} icon={ic} label={l} selected={cat === k} onPress={() => setCat(k)} />)}</Row>
      </Section>
      {cat ? (
        <>
          <Section title="2 · Say it in a sentence (optional)">
            <Field label="What doesn’t work?" value={text} onChangeText={setText} multiline placeholder="e.g. Gate SOP step 4 assumes a key we don’t carry" />
            <Row wrap>
              {speechSupported() ? (
                <Button size="sm" kind={listening ? 'danger' : 'secondary'} icon={listening ? 'stop' : 'mic'} label={listening ? 'Stop' : 'Speak'}
                  onPress={() => { if (listening) { listening(); setListening(null); } else setListening(() => startDictation(lang, setText, () => setListening(null))); }} />
              ) : null}
              {frictionClips.map((f, i) => <Chip key={f.id} icon="mic-outline" label={`Demo: ${f.text.slice(0, 26)}…`} onPress={() => void sayScripted(i)} />)}
            </Row>
          </Section>
          {cat === 'sop' ? (
            <Section title="Which SOP step?">
              <Row wrap>{(sopId ? [s.sops.find((x) => x.id === sopId)!] : s.sops.slice(0, 8)).filter(Boolean).map((x) => <Chip key={x.id} label={x.code} selected={sopId === x.id} onPress={() => setSopId(sopId === x.id ? undefined : x.id)} />)}</Row>
              {sop ? <Row wrap>{sop.steps.map((st) => <Chip key={st.n} label={`Step ${st.n}`} selected={stepN === st.n} onPress={() => setStepN(st.n)} />)}</Row> : null}
              {sop && stepN ? <Txt v="caption">“{sop.steps.find((x) => x.n === stepN)?.text}”</Txt> : null}
            </Section>
          ) : null}
          {assetId ? <Pill tone="muted" icon="pricetag-outline" label={s.assets.find((a) => a.id === assetId)?.name ?? assetId} /> : null}
          <AttachmentStrip items={photos} />
          <PhotoPicker assetId={assetId} onPick={(a) => setPhotos((p) => [...p, a])} label="Photo (optional)" />
          <Button size="lg" icon="send" label="Send" onPress={send} />
        </>
      ) : null}

      <Section title="My logs">
        {mine.length === 0 ? <Txt v="small">Nothing filed yet.</Txt> : null}
        {mine.map((f) => {
          const idx = FLOW.indexOf(f.status as (typeof FLOW)[number]);
          return (
            <Card key={f.id} tone={f.status === 'decided' ? 'pass' : undefined}>
              <View style={{ gap: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Pill tone="muted" label={f.category.toUpperCase()} />
                  <Row gap={6}>
                    {pending.has(f.id) ? <Pill tone="attention" label="Pending sync" /> : null}
                    <Txt v="caption">{ago(f.createdAt, now)}</Txt>
                  </Row>
                </Row>
                <Txt>{f.text}</Txt>
                <Row gap={4}>
                  {FLOW.map((st, i) => (
                    <View key={st} style={{ flex: 1, gap: 4 }}>
                      <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= idx ? (st === 'decided' || st === 'closed' ? c.pass : c.primary) : c.border }} />
                      <Txt v="caption" color={i <= idx ? c.text : c.textMuted} style={{ fontSize: 11 }}>{STATUS_LABEL[st] ?? 'Closed'}</Txt>
                    </View>
                  ))}
                </Row>
                {f.routedTo === 'hq' && f.status === 'under_review' ? <Txt v="caption">With HQ for a decision.</Txt> : null}
                {f.decisionText ? (
                  <View style={{ backgroundColor: c.passBg, borderRadius: 10, padding: 10, gap: 4 }}>
                    <Row gap={6}><Icon name="megaphone-outline" size={16} color={c.pass} /><Txt v="label" color={c.pass}>Decision</Txt></Row>
                    <Txt v="small" color={c.text}>{f.decisionText}</Txt>
                  </View>
                ) : null}
                {f.status === 'decided' ? <Button size="sm" kind="secondary" icon="checkmark" label="Got it, close" onPress={() => dispatch({ type: 'friction.close', logId: f.id })} /> : null}
              </View>
            </Card>
          );
        })}
      </Section>
    </Screen>
  );
}
