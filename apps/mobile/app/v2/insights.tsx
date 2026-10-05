import { kpis } from '@mozart/actions';
import type { SopEditDraft } from '@mozart/ai';
import type { Theme, ThemeDecision } from '@mozart/schema';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { ago } from '@/lib/format';
import { useView } from '@/lib/hooks';
import { getAi, useApp } from '@/store/app';
import { PageHeader, useWide } from '@/v2/shell';
import { Badge, Btn, Col, Field, Row, Surface, T, useV2 } from '@/v2/ui';

const LABEL: Record<ThemeDecision, string> = { changeSop: 'SOP changed', fixEquipment: 'Equipment fix', noChange: 'No change' };

/** HQ insights: friction themes across sites → decision → policy update in officers' briefings. */
export default function Insights() {
  const c = useV2();
  const s = useView();
  const wide = useWide();
  const { theme } = useLocalSearchParams<{ theme?: string }>();
  const latest = (t: Theme) => Math.max(0, ...s.frictionLogs.filter((f) => t.logIds.includes(f.id)).map((f) => Date.parse(f.updatedAt)));
  const themes = [...s.themes].sort((a, b) => Number(!!a.decision) - Number(!!b.decision) || latest(b) - latest(a));
  const [sel, setSel] = useState<string>(theme ?? themes[0]?.id);
  const t = s.themes.find((x) => x.id === sel);
  const k = kpis(s);
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Insights" subtitle="What officers are telling HQ, clustered across sites" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: wide ? 32 : 12, paddingBottom: 60, gap: 16 }}>
        <Row wrap gap={10}>
          {([['Open themes', `${k.themesOpen}`], ['Friction → decision', `${k.daysToDecision.toFixed(1)} d`], ['Briefing acks', `${Math.round(k.briefingAckRate * 100)}%`], ['Closed with evidence', `${Math.round(k.evidenceRate * 100)}%`]] as const).map(([l, v]) => (
            <Surface key={l} style={{ flexGrow: 1, flexBasis: 150, gap: 2 }}><T v="caption">{l}</T><T v="title">{v}</T></Surface>
          ))}
        </Row>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          <Col gap={8} style={{ width: wide ? 380 : '100%' }}>
            {themes.map((x) => (
              <Pressable key={x.id} onPress={() => setSel(x.id)} accessibilityRole="button"
                style={({ hovered }) => ({ padding: 14, borderRadius: 16, gap: 6, borderWidth: 1, borderColor: sel === x.id ? c.orange : c.border, backgroundColor: sel === x.id ? c.orangeSoft : hovered ? c.sunken : c.surface })}>
                <Row style={{ justifyContent: 'space-between' }} align="flex-start">
                  <T v="smallStrong" style={{ flex: 1 }}>{x.label}</T>
                  {x.decision ? <Badge tone="pass" label={LABEL[x.decision]} /> : <Badge tone="orange" label="Decide" />}
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="caption">{x.logIds.length} logs · {x.siteIds.length} sites · {x.category}</T>
                  <Spark weeks={x.weeks.map((w) => w.count)} />
                </Row>
              </Pressable>
            ))}
          </Col>
          {t ? <ThemeDetail key={t.id} t={t} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Spark({ weeks }: { weeks: number[] }) {
  const c = useV2();
  const max = Math.max(1, ...weeks);
  return (
    <Row gap={2} align="flex-end" style={{ height: 22 }}>
      {weeks.map((n, i) => <View key={i} style={{ width: 6, height: Math.max(2, (n / max) * 22), borderRadius: 2, backgroundColor: i === weeks.length - 1 ? c.orange : c.navy, opacity: n ? 1 : 0.25 }} />)}
    </Row>
  );
}

function ThemeDetail({ t }: { t: Theme }) {
  const c = useV2();
  const s = useView();
  const dispatch = useApp((x) => x.dispatch);
  const [mode, setMode] = useState<ThemeDecision | null>(null);
  const [draft, setDraft] = useState<SopEditDraft | null>(null);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const logs = s.frictionLogs.filter((f) => t.logIds.includes(f.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sop = s.sops.find((x) => x.id === t.sopId);
  const step = sop?.steps.find((x) => x.n === t.sopStep);
  const site = (id: string) => s.sites.find((x) => x.id === id)?.short ?? id;
  const max = Math.max(1, ...t.weeks.map((w) => w.count));

  const decide = () => {
    const r = dispatch({
      type: 'hq.decide', themeId: t.id, decision: mode!, note: note.trim(),
      sopEdit: mode === 'changeSop' && sop && t.sopStep ? { sopId: sop.id, n: t.sopStep, text: text.trim() } : undefined,
      newRecordId: mode === 'fixEquipment' ? `CWO-24${String(Date.now()).slice(-4)}` : undefined,
    }, { confirm: true });
    if (r.ok) { useApp.getState().toast({ kind: 'success', title: mode === 'changeSop' ? `${sop?.code} published` : 'Decision recorded', body: `Officers at ${t.siteIds.map(site).join(', ')} see it in their briefing.` }); setMode(null); }
  };

  return (
    <Col gap={14} style={{ flex: 1, width: '100%' }}>
      <Surface style={{ gap: 12 }}>
        <Row wrap gap={6}>{t.siteIds.map((id) => <Badge key={id} label={site(id)} />)}<Badge tone="navy" label={`${t.logIds.length} logs`} /></Row>
        <T v="h2">{t.label}</T>
        <T color={c.text}>{t.summary}</T>
        {sop && step ? <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.sunken, gap: 4 }}><T v="label">{sop.code} v{sop.version} · step {step.n}</T><T v="small" color={c.text}>“{step.text}”</T></View> : null}
        <Col gap={6}>
          <T v="caption">Logs per week (last 8)</T>
          <Row gap={6} align="flex-end" style={{ height: 80 }}>
            {t.weeks.map((w, i) => (
              <Col key={i} gap={4} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: '70%', height: Math.max(2, (w.count / max) * 60), borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: i === t.weeks.length - 1 ? c.orange : c.navy, opacity: w.count ? 1 : 0.2 }} />
                <T v="caption" color={c.textFaint}>{w.count}</T>
              </Col>
            ))}
          </Row>
          <T v="caption">Mean sentiment {t.sentimentScore.toFixed(2)} (−1 to +1)</T>
        </Col>
      </Surface>
      {t.decision ? (
        <Surface tone="pass" style={{ gap: 4 }}><T v="label" color={c.pass}>Decided {t.decidedAt ? ago(t.decidedAt) : ''} · {LABEL[t.decision]}</T><T color={c.text}>{t.decisionNote}</T></Surface>
      ) : (
        <Surface style={{ gap: 12, borderColor: c.orange }}>
          <T v="title">Decide</T>
          <Row wrap gap={8}>
            <Btn kind={mode === 'changeSop' ? 'primary' : 'soft'} icon="document-text-outline" label="Change SOP" disabled={!sop} onPress={async () => {
              setMode('changeSop'); setBusy(true);
              const d = await getAi().draftSopEdit(t, sop!, logs);
              setDraft(d); setText(d.proposedText);
              setNote(t.id === 'th-gate-key' ? 'Override key stays under FCC control; FCC dispatches a runner so the officer never leaves a jammed gate.' : '');
              setBusy(false);
            }} />
            <Btn kind={mode === 'fixEquipment' ? 'primary' : 'soft'} icon="construct-outline" label="Fix equipment" onPress={() => { setMode('fixEquipment'); setNote(''); }} />
            <Btn kind={mode === 'noChange' ? 'primary' : 'soft'} icon="remove-circle-outline" label="No change" onPress={() => { setMode('noChange'); setNote(''); }} />
          </Row>
          {mode === 'changeSop' ? (busy || !draft ? <Row><ActivityIndicator color={c.orange} /><T v="small">Drafting the edit from {logs.length} logs…</T></Row> : (
            <Col gap={10}>
              <Badge tone="info" label="AI draft · you publish" />
              <T v="small" style={{ textDecorationLine: 'line-through' }}>{draft.currentText}</T>
              <Field label={`New step ${draft.n}`} value={text} onChangeText={setText} multiline />
              <T v="caption">Why: {draft.rationale}</T>
              <Field label="Note to officers" value={note} onChangeText={setNote} multiline />
              <Btn size="lg" icon="megaphone-outline" label={`Publish to ${t.siteIds.length} site briefings`} disabled={!text.trim() || !note.trim()} onPress={decide} />
            </Col>
          )) : null}
          {mode === 'fixEquipment' || mode === 'noChange' ? (
            <Col gap={10}>
              <Field label={mode === 'fixEquipment' ? 'What will be fixed (creates a work order)' : 'Reason (shown to officers)'} value={note} onChangeText={setNote} multiline />
              <Btn icon="checkmark" label="Record decision" disabled={!note.trim()} onPress={decide} />
            </Col>
          ) : null}
        </Surface>
      )}
      <T v="label">Logs</T>
      {logs.map((l) => (
        <Surface key={l.id} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}><T v="caption">{l.officerName ?? s.officers.find((o) => o.id === l.officerId)?.name} · {site(l.siteId)}</T><T v="caption">{ago(l.createdAt)}</T></Row>
          <T v="small" color={c.text}>{l.text}</T>
        </Surface>
      ))}
    </Col>
  );
}
