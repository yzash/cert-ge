/**
 * Side panel (desktop) / sheet (phone) for detail views opened from chat cards:
 * a work order, a cited document, or a robot snapshot.
 */
import { hasEvidence } from '@mozart/actions';
import { v2 } from '@mozart/ui';
import React, { useRef } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { create } from 'zustand';
import { SceneImage } from '@/components/media';
import { clock, officerName, slaText, sopLabel, STATUS_LABEL, zoneName } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { useApp } from '@/store/app';
import { PhotoButton } from './photo';
import { Badge, Btn, Col, Divider, FadeIn, IconBtn, KV, Row, Surface, T, useV2 } from './ui';

export type PanelSpec = { kind: 'wo'; id: string } | { kind: 'doc'; id: string; section?: string } | null;

export const usePanel = create<{ panel: PanelSpec; open(p: PanelSpec): void; close(): void }>((set) => ({
  panel: null,
  open: (panel) => set({ panel }),
  close: () => set({ panel: null }),
}));

export function PanelHost() {
  const c = useV2();
  const { panel, close } = usePanel();
  const { width } = useWindowDimensions();
  if (!panel) return null;
  const wide = width >= 1100;
  const body = panel.kind === 'wo' ? <WorkOrderPanel id={panel.id} /> : <DocPanel id={panel.id} section={panel.section} />;
  if (wide) {
    return (
      <View style={{ width: 440, borderLeftWidth: 1, borderLeftColor: c.border, backgroundColor: c.surface }}>
        <Row style={{ justifyContent: 'flex-end', padding: 8 }}><IconBtn icon="close" label="Close panel" onPress={close} /></Row>
        <ScrollView contentContainerStyle={{ padding: v2.space.lg, paddingTop: 0, gap: 14, paddingBottom: 60 }}>{body}</ScrollView>
      </View>
    );
  }
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim, zIndex: 40, justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" />
      <FadeIn style={{ maxHeight: '88%', backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 }}>
          <View style={{ width: 44 }} />
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong }} />
          <IconBtn icon="close" label="Close panel" onPress={close} />
        </Row>
        <ScrollView contentContainerStyle={{ padding: v2.space.lg, paddingTop: 4, gap: 14, paddingBottom: 40 }}>{body}</ScrollView>
      </FadeIn>
    </View>
  );
}

export function DocPanel({ id, section }: { id: string; section?: string }) {
  const c = useV2();
  const s = useView();
  const doc = s.docs.find((d) => d.id === id);
  const sop = s.sops.find((x) => x.id === id);
  const scroll = useRef<View>(null);
  if (!doc) return <T>Document not found.</T>;
  const last = sop?.history[sop.history.length - 1];
  return (
    <Col gap={12}>
      <Col gap={4}>
        <T v="label">{doc.kind === 'policy' ? 'HR policy' : doc.kind === 'sop' ? 'SOP' : doc.kind}</T>
        <T v="title">{doc.title}</T>
        <Row wrap>
          {doc.version ? <Badge label={`v${doc.version}`} /> : null}
          {sop && sop.history.length > 1 ? <Badge tone="orange" label={`Updated ${clock(last!.at)}`} /> : null}
        </Row>
      </Col>
      <View ref={scroll} style={{ gap: 10 }}>
        {doc.sections.map((sec) => {
          const hit = sec.id === section;
          const changed = sop && last && sop.history.length > 1 && last.note.startsWith(`step ${sec.id.slice(1)} `);
          return (
            <View key={sec.id} style={{ padding: 14, borderRadius: v2.radius.md, backgroundColor: hit ? c.orangeSoft : c.sunken, gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="smallStrong" color={c.text}>{sec.heading}</T>
                {changed ? <Badge tone="orange" label="New" /> : hit ? <Badge tone="orange" label="Cited" /> : null}
              </Row>
              <T v="small" color={c.text} selectable>{sec.body}</T>
            </View>
          );
        })}
      </View>
    </Col>
  );
}

export function WorkOrderPanel({ id }: { id: string }) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const now = useNow();
  const dispatch = useApp((x) => x.dispatch);
  const open = usePanel((x) => x.open);
  const wo = s.workOrders.find((w) => w.id === id);
  if (!wo) return <T>Work order not found (it may still be syncing).</T>;
  const mins = Math.round((Date.parse(wo.slaDue) - now) / 60000);
  const mine = wo.assigneeId === me.id;
  const active = !['closed', 'pending_approval'].includes(wo.status);
  const evidence = hasEvidence(wo);
  const asset = s.assets.find((a) => a.id === wo.assetId);
  const photos = [...wo.attachments, ...wo.steps.flatMap((st) => st.attachments)];
  return (
    <Col gap={14}>
      <Col gap={6}>
        <Row wrap>
          <T v="mono" color={c.textFaint}>{wo.id}</T>
          <Badge tone={wo.status === 'closed' ? 'pass' : wo.status === 'pending_approval' ? 'warn' : 'navy'} label={STATUS_LABEL[wo.status]} />
          <Badge tone={wo.priority === 'high' || wo.priority === 'critical' ? 'fail' : 'neutral'} label={wo.priority} />
          {wo.source === 'robot' ? <Badge tone="info" icon="hardware-chip-outline" label="From robot" /> : wo.source === 'voice' ? <Badge tone="info" icon="mic-outline" label="From voice" /> : null}
        </Row>
        <T v="title">{wo.title}</T>
        <T v="small">{wo.description}</T>
      </Col>
      <Surface style={{ gap: 6 }}>
        <KV k="Where" v={zoneName(s, wo.siteId, wo.zoneId)} />
        {asset ? <KV k="Asset" v={asset.name} /> : null}
        <KV k="Assignee" v={officerName(s, wo.assigneeId)} />
        {active ? <KV k="SLA" v={slaText(mins)} strong /> : null}
        {wo.sopId ? <Pressable onPress={() => open({ kind: 'doc', id: wo.sopId! })}><KV k="SOP" v={<T v="smallStrong" color={c.orange}>{sopLabel(s, wo.sopId)}</T>} /></Pressable> : null}
      </Surface>
      {photos.length ? <SceneImage uri={photos[photos.length - 1].uri} height={180} /> : null}
      <Col gap={6}>
        <T v="label">Steps</T>
        {wo.steps.map((st) => {
          const ver = st.verificationId ? s.verifications.find((v) => v.id === st.verificationId) : undefined;
          return (
            <Pressable key={st.id} disabled={!mine || !active} onPress={() => dispatch({ type: 'wo.step', woId: wo.id, stepId: st.id, done: !st.done })}
              accessibilityRole="checkbox" accessibilityState={{ checked: st.done }}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.sunken }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: st.done ? c.pass : c.borderStrong, backgroundColor: st.done ? c.pass : 'transparent' }} />
              <View style={{ flex: 1 }}>
                <T v="small" color={c.text} style={{ textDecorationLine: st.done ? 'line-through' : 'none' }}>{st.label}</T>
                {ver ? <T v="caption">{(ver.override ?? ver.verdict).toUpperCase()} · {ver.reason.slice(0, 70)}</T> : null}
              </View>
            </Pressable>
          );
        })}
      </Col>
      {mine && active ? (
        <Col gap={10}>
          {wo.status === 'assignment' ? <Btn kind="navy" icon="checkmark" label="Acknowledge" onPress={() => dispatch({ type: 'wo.status', woId: wo.id, status: 'acknowledged' })} /> : null}
          <PhotoButton assetId={wo.assetId} label={evidence ? 'Add another photo' : 'Add photo evidence'} onPick={(a) => dispatch({ type: 'wo.attach', woId: wo.id, attachment: a })} />
          <Btn size="lg" icon="lock-closed" label={evidence ? 'Confirm and close' : 'Add evidence to close'} disabled={!evidence}
            onPress={() => {
              const r = dispatch({ type: 'wo.requestClose', woId: wo.id, signature: `tap:${me.name}@${new Date().toISOString()}` }, { confirm: true });
              if (r.ok) useApp.getState().toast({ kind: 'success', title: `${wo.id} closed`, body: 'Sent to your supervisor for approval.' });
            }} />
          <T v="caption">Closing signs with your tap and timestamp (SOP-OPS-004 evidence rule applies).</T>
        </Col>
      ) : null}
      {wo.status === 'pending_approval' && me.role === 'supervisor' ? (
        <Btn size="lg" icon="checkmark-done" label="Approve closure" onPress={() => dispatch({ type: 'closure.approve', woId: wo.id }, { confirm: true })} />
      ) : null}
      {wo.status === 'closed' ? <Badge tone="pass" icon="checkmark" label={`Closed ${clock(wo.closedAt)} · approved by ${officerName(s, wo.approvedBy)}`} /> : null}
      <Divider />
    </Col>
  );
}
