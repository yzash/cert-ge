import { kpis } from '@mozart/actions';
import type { SopEditDraft } from '@mozart/ai';
import type { FrictionCategory, Theme, ThemeDecision } from '@mozart/schema';
import { space, radius, brand } from '@mozart/ui';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Sparkbars, WeeklyCharts } from '@/components/charts';
import { Button, Card, Chip, Field, Icon, ModeBadge, Pill, Row, Txt } from '@/components/ui';
import { ago, clock } from '@/lib/format';
import { useView } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { getAi, useApp } from '@/store/app';

const CATS: (FrictionCategory | 'all')[] = ['all', 'sop', 'equipment', 'safety', 'access', 'tooling'];
const DECISION_LABEL: Record<ThemeDecision, string> = { changeSop: 'SOP changed', fixEquipment: 'Equipment fix', noChange: 'No change' };

/** F10 HQ feedback loop (web): clustered friction themes → decision → policy update in briefings. */
export default function HQ() {
  const c = useTheme();
  const s = useApp((x) => x.view);
  const session = useApp((x) => x.session);
  const signIn = useApp((x) => x.signIn);
  const { width } = useWindowDimensions();
  const wide = width >= 980;

  useEffect(() => {
    const me = s?.officers.find((o) => o.id === session?.officerId);
    if (s && me?.role !== 'hq') void signIn('o-raj', true);
  }, [s, session?.officerId]);

  if (!s || !session) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return <HQBody wide={wide} width={width} />;
}

function HQBody({ wide, width }: { wide: boolean; width: number }) {
  const c = useTheme();
  const s = useView();
  const mode = useApp((x) => x.settings.aiMode);
  const theme = useApp((x) => x.settings.theme);
  const setSettings = useApp((x) => x.setSettings);
  const [site, setSite] = useState<string>('all');
  const [cat, setCat] = useState<FrictionCategory | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const k = kpis(s);

  const themes = useMemo(() => s.themes
    .filter((t) => (site === 'all' || t.siteIds.includes(site)) && (cat === 'all' || t.category === cat))
    .sort((a, b) => Number(!!a.decision) - Number(!!b.decision) || b.logIds.length - a.logIds.length), [s.themes, site, cat]);
  const current = s.themes.find((t) => t.id === (selected ?? themes[0]?.id));
  const totalLogs = s.frictionLogs.filter((f) => f.routedTo === 'hq').length;

  const detailW = wide ? Math.min(760, width - 460) : width - 32;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* top bar */}
      <View style={{ backgroundColor: brand.navy, paddingHorizontal: space.xl, paddingVertical: space.md, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: brand.orange, alignItems: 'center', justifyContent: 'center' }}><Txt v="bodyStrong" color="#fff">M</Txt></View>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Txt v="title" color="#fff">Mozart Frontline · HQ feedback</Txt>
          <Txt v="caption" color="#B9C8DC">Raj Kumar · Head of Security Operations · 4 sites</Txt>
        </View>
        <ModeBadge mode={mode} />
        <Chip icon={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} label={theme === 'dark' ? 'Light' : 'Dark'} onPress={() => setSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} />
        <Chip icon="phone-portrait-outline" label="Officer app" onPress={() => router.replace('/sign-in')} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: 80 }}>
        {/* KPIs */}
        <Row wrap gap={space.md}>
          {([
            ['Open themes', `${k.themesOpen}`, `${totalLogs} logs at HQ, 8 weeks`],
            ['Friction → decision', `${k.daysToDecision.toFixed(1)} d`, 'avg, decided themes (target < 7)'],
            ['Briefing ack rate', `${Math.round(k.briefingAckRate * 100)}%`, 'Canopy Mall policy updates (target 90%)'],
            ['Closed with evidence', `${Math.round(k.evidenceRate * 100)}%`, 'corrective WOs (target 95%)'],
            ['Voice reports', `${k.voiceReports}`, 'this demo session'],
          ] as const).map(([l, v, sub]) => (
            <View key={l} style={{ flexGrow: 1, flexBasis: 170, backgroundColor: c.surface, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: c.border }}>
              <Txt v="caption">{l}</Txt>
              <Txt v="h2">{v}</Txt>
              <Txt v="caption">{sub}</Txt>
            </View>
          ))}
        </Row>

        {/* filters: one row above the charts */}
        <Row wrap>
          <Txt v="label">Site</Txt>
          {['all', ...s.sites.map((x) => x.id)].map((id) => <Chip key={id} label={id === 'all' ? 'All sites' : s.sites.find((x) => x.id === id)!.short} selected={site === id} onPress={() => setSite(id)} />)}
          <View style={{ width: 12 }} />
          <Txt v="label">Category</Txt>
          {CATS.map((k2) => <Chip key={k2} label={k2 === 'all' ? 'All' : k2 === 'sop' ? 'SOP' : k2} selected={cat === k2} onPress={() => setCat(k2)} />)}
        </Row>

        <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.lg, alignItems: 'flex-start' }}>
          {/* theme list */}
          <View style={{ width: wide ? 400 : '100%', gap: space.sm }}>
            <Txt v="label">Themes · clustered nightly</Txt>
            {themes.map((t) => (
              <Pressable key={t.id} onPress={() => setSelected(t.id)} accessibilityRole="button"
                style={{ padding: space.md, borderRadius: radius.md, backgroundColor: current?.id === t.id ? c.surfaceAlt : c.surface, borderWidth: current?.id === t.id ? 2 : 1, borderColor: current?.id === t.id ? c.primary : c.border, gap: 6 }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Txt v="bodyStrong" style={{ flex: 1 }}>{t.label}</Txt>
                  {t.decision ? <Pill tone="pass" icon="checkmark" label={DECISION_LABEL[t.decision]} /> : <Pill tone="attention" label="Needs decision" />}
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="caption">{t.logIds.length} logs · {t.siteIds.length} site{t.siteIds.length > 1 ? 's' : ''} · {t.category} · sentiment {t.sentimentScore.toFixed(2)}</Txt>
                  <Sparkbars weeks={t.weeks} />
                </Row>
              </Pressable>
            ))}
          </View>

          {/* detail */}
          {current ? <ThemeDetail key={current.id} t={current} width={detailW} /> : null}
        </View>

        <PublishedUpdates />

        <Pressable onPress={() => setShowAudit((x) => !x)}><Txt v="label" color={c.primary}>{showAudit ? '▾' : '▸'} Audit log (AI calls and Mozart writes)</Txt></Pressable>
        {showAudit ? (
          <Card>
            {s.audit.slice(0, 40).map((a) => (
              <Txt key={a.id} v="mono" color={a.kind === 'ai_failure' ? c.fail : c.textMuted} style={{ fontSize: 12 }}>
                {clock(a.at)} {a.kind.padEnd(12)} {a.feature.padEnd(22)} {a.officerId.padEnd(10)} {a.model ?? ''} {a.latencyMs !== undefined ? `${a.latencyMs}ms` : ''} {a.promptHash ? `#${a.promptHash}` : ''} {a.recordId ?? ''} {a.confirmedAt ? `confirmed ${clock(a.confirmedAt)}` : ''}
              </Txt>
            ))}
            {s.audit.length === 0 ? <Txt v="caption">No entries yet.</Txt> : null}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ThemeDetail({ t, width }: { t: Theme; width: number }) {
  const c = useTheme();
  const s = useView();
  const dispatch = useApp((x) => x.dispatch);
  const [mode, setMode] = useState<ThemeDecision | null>(null);
  const [draft, setDraft] = useState<(SopEditDraft & { meta: { mode: string; fallback?: boolean } }) | null>(null);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const logs = s.frictionLogs.filter((f) => t.logIds.includes(f.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sop = s.sops.find((x) => x.id === t.sopId);
  const step = sop?.steps.find((x) => x.n === t.sopStep);
  const siteName = (id: string) => s.sites.find((x) => x.id === id)?.short ?? id;

  async function startChange() {
    setMode('changeSop');
    if (!sop) return;
    setBusy(true);
    const d = await getAi().draftSopEdit(t, sop, logs);
    setDraft(d);
    setText(d.proposedText);
    setNote(t.id === 'th-gate-key' ? 'Override key stays under FCC control; FCC dispatches a runner so the officer never leaves a jammed gate.' : '');
    setBusy(false);
  }

  function decide() {
    if (!mode) return;
    const r = dispatch({
      type: 'hq.decide', themeId: t.id, decision: mode, note: note.trim(),
      sopEdit: mode === 'changeSop' && sop && t.sopStep ? { sopId: sop.id, n: t.sopStep, text: text.trim() } : undefined,
      newRecordId: mode === 'fixEquipment' ? `CWO-24${String(Date.now()).slice(-4)}` : undefined,
    }, { confirm: true });
    if (r.ok) {
      useApp.getState().toast({ kind: 'success', title: mode === 'changeSop' ? `${sop?.code} published` : 'Decision recorded', body: mode === 'changeSop' ? `Policy update pushed to briefings at ${t.siteIds.map(siteName).join(', ')}. ${new Set(logs.map((l) => l.officerId)).size} officers notified.` : 'Officers who logged this were notified.' });
      setMode(null);
    }
  }

  return (
    <View style={{ flex: 1, width: '100%', gap: space.md }}>
      <Card>
        <View style={{ gap: 10 }}>
          <Row wrap>
            <Pill tone="info" label={t.category.toUpperCase()} />
            {t.siteIds.map((id) => <Pill key={id} tone="muted" label={siteName(id)} />)}
            <Pill tone="muted" label={`${t.logIds.length} logs`} />
          </Row>
          <Txt v="h2">{t.label}</Txt>
          <Txt>{t.summary}</Txt>
          {sop && step ? (
            <Pressable onPress={() => router.push(`/doc/${sop.id}`)} style={{ backgroundColor: c.surfaceAlt, padding: space.md, borderRadius: 10, gap: 4 }}>
              <Txt v="label" color={c.primary}>{sop.code} v{sop.version} · step {step.n}</Txt>
              <Txt v="small" color={c.text}>“{step.text}”</Txt>
            </Pressable>
          ) : null}
          <WeeklyCharts weeks={t.weeks} width={Math.max(280, width - 40)} />
        </View>
      </Card>

      {/* Decide */}
      {t.decision ? (
        <Card tone="pass">
          <Txt v="label" color={c.pass}>Decided {t.decidedAt ? ago(t.decidedAt) : ''} · {DECISION_LABEL[t.decision]}</Txt>
          <Txt style={{ marginTop: 4 }}>{t.decisionNote}</Txt>
        </Card>
      ) : (
        <Card tone="accent">
          <View style={{ gap: space.md }}>
            <Txt v="title">Decide</Txt>
            <Row wrap>
              <Button icon="document-text-outline" label="Change SOP" kind={mode === 'changeSop' ? 'primary' : 'secondary'} disabled={!sop} onPress={() => void startChange()} />
              <Button icon="construct-outline" label="Fix equipment" kind={mode === 'fixEquipment' ? 'primary' : 'secondary'} onPress={() => { setMode('fixEquipment'); setNote(''); }} />
              <Button icon="remove-circle-outline" label="No change" kind={mode === 'noChange' ? 'primary' : 'secondary'} onPress={() => { setMode('noChange'); setNote(''); }} />
            </Row>
            {mode === 'changeSop' ? (
              busy ? <Row><ActivityIndicator color={c.primary} /><Txt v="small">Drafting the SOP edit from {logs.length} logs…</Txt></Row> : draft ? (
                <View style={{ gap: 10 }}>
                  <Row wrap><Pill tone="purple" icon="sparkles" label="AI draft · a human publishes" /><ModeBadge mode={draft.meta.mode} fallback={draft.meta.fallback} /></Row>
                  <Txt v="label">Current step {draft.n}</Txt>
                  <Txt v="small" style={{ textDecorationLine: 'line-through' }}>{draft.currentText}</Txt>
                  <Field label={`Proposed step ${draft.n} (edit before publishing)`} value={text} onChangeText={setText} multiline />
                  <Txt v="caption">Why: {draft.rationale}</Txt>
                  <Field label="Decision note (shown to officers)" value={note} onChangeText={setNote} multiline />
                  <Button size="lg" icon="megaphone-outline" label={`Publish ${sop?.code} v${bump(sop!.version)} to ${t.siteIds.length} site briefing${t.siteIds.length > 1 ? 's' : ''}`} disabled={!text.trim() || !note.trim()} onPress={decide} />
                </View>
              ) : null
            ) : null}
            {mode === 'fixEquipment' || mode === 'noChange' ? (
              <View style={{ gap: 10 }}>
                <Field label={mode === 'fixEquipment' ? 'What will be fixed? (creates a work order)' : 'Reason for no change (shown to officers)'} value={note} onChangeText={setNote} multiline />
                <Button icon="checkmark-circle" label={mode === 'fixEquipment' ? 'Create work order and notify' : 'Record decision'} disabled={!note.trim()} onPress={decide} />
              </View>
            ) : null}
          </View>
        </Card>
      )}

      <Txt v="label">Logs behind this theme</Txt>
      {logs.map((l) => (
        <View key={l.id} style={{ padding: space.md, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: Date.parse(l.createdAt) > Date.now() - 6 * 3600_000 ? c.primary : c.border, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="caption">{l.officerName ?? s.officers.find((o) => o.id === l.officerId)?.name} · {siteName(l.siteId)}</Txt>
            <Row gap={6}>
              {Date.parse(l.createdAt) > Date.now() - 6 * 3600_000 ? <Pill tone="accent" label="New tonight" /> : null}
              <Txt v="caption">{ago(l.createdAt)}</Txt>
            </Row>
          </Row>
          <Txt v="small" color={c.text}>{l.text}</Txt>
          {l.sentiment !== undefined ? <Txt v="caption">sentiment {l.sentiment.toFixed(2)}</Txt> : null}
        </View>
      ))}
    </View>
  );
}

function bump(v: string) {
  const [a, b = '0'] = v.split('.');
  return `${a}.${Number(b) + 1}`;
}

function PublishedUpdates() {
  const c = useTheme();
  const s = useView();
  const updates = s.briefingItems.filter((b) => b.type === 'policyUpdate').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const officersAt = (siteId: string) => s.officers.filter((o) => o.siteId === siteId && o.role === 'officer' && o.shiftId === 'night').length;
  return (
    <View style={{ gap: space.sm }}>
      <Txt v="label">Published updates · acknowledgement</Txt>
      <Row wrap gap={space.md}>
        {updates.slice(0, 8).map((u) => {
          const n = officersAt(u.siteId);
          const acks = Object.keys(u.ackByOfficerId).length;
          return (
            <View key={u.id} style={{ flexGrow: 1, flexBasis: 280, padding: space.md, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}><Pill tone="muted" label={s.sites.find((x) => x.id === u.siteId)?.short ?? u.siteId} /><Txt v="caption">{ago(u.createdAt)}</Txt></Row>
              <Txt v="small" color={c.text} style={{ fontWeight: '700' }}>{u.title}</Txt>
              {n ? (
                <>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, (acks / n) * 100)}%`, height: '100%', backgroundColor: c.pass }} />
                  </View>
                  <Row gap={6}><Icon name="checkmark-done" size={14} color={c.textMuted} /><Txt v="caption">{acks} of {n} night-shift officers acknowledged</Txt></Row>
                </>
              ) : <Txt v="caption">Site not in demo roster · ack tracked in Mozart</Txt>}
            </View>
          );
        })}
      </Row>
    </View>
  );
}
