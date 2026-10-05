import { fleet, fleetSummary, newId, newRecordNumber, robotPose, zoneDistance, zoneOf, type RobotPose } from '@mozart/actions';
import type { RobotAction } from '@mozart/actions';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { SceneImage } from '@/components/media';
import { ago } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { useApp } from '@/store/app';
import { useChat } from '../chatStore';
import { usePanel } from '../panels';
import { SiteMap } from '../siteMap';
import { Badge, Btn, Chip, Col, Icon, Meter, Row, Surface, T, useV2 } from '../ui';
import type { CardProps } from './core';

export const STATUS_LABEL: Record<RobotPose['status'], string> = {
  patrolling: 'Patrolling', cleaning: 'Cleaning', paused: 'Paused', moving: 'On the way', returning: 'Returning to dock', holding: 'Holding position', docked: 'Docked', charging: 'Charging',
};

export function statusTone(st: RobotPose['status']): 'pass' | 'warn' | 'neutral' | 'info' {
  return st === 'paused' ? 'warn' : st === 'charging' || st === 'docked' ? 'neutral' : st === 'returning' || st === 'moving' ? 'info' : 'pass';
}

export function RobotRow({ p, onPress, selected }: { p: RobotPose; onPress?: () => void; selected?: boolean }) {
  const c = useV2();
  return (
    <Surface onPress={onPress} padded={false} style={{ padding: 12, gap: 6, borderColor: selected ? c.orange : c.border }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={8}>
          <Icon name={p.robot.kind === 'patrol' ? 'shield-outline' : 'water-outline'} color={p.robot.kind === 'patrol' ? c.navy : c.orange} />
          <T v="smallStrong">{p.robot.name}</T>
        </Row>
        <Badge tone={statusTone(p.status)} label={STATUS_LABEL[p.status]} />
      </Row>
      <T v="caption">{p.zone?.name}{p.robot.kind === 'cleaning' && p.progress ? ` · ${p.progress} m² this run` : ''}{p.pausedReason ? ` · ${p.pausedReason}` : ''}</T>
      <Row gap={8}><Icon name="battery-half-outline" size={16} /><Meter value={p.battery / 100} tone={p.battery < 25 ? 'fail' : p.battery < 50 ? 'warn' : 'pass'} /><T v="caption" style={{ width: 36, textAlign: 'right' }}>{p.battery}%</T></Row>
    </Surface>
  );
}

export function RobotsStatusCard() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const now = useNow(2000);
  const site = me.siteId === 'HQ' ? 'CNP' : me.siteId;
  const poses = fleet(s, site, now);
  const sum = fleetSummary(s, site, now);
  return (
    <Surface style={{ gap: 12 }}>
      <Row wrap gap={6}>
        <Badge tone="pass" label={`${sum.working} working`} />
        {sum.paused ? <Badge tone="warn" label={`${sum.paused} paused`} /> : null}
        <Badge label={`${sum.charging} charging`} />
        {sum.openEvents ? <Badge tone="fail" label={`${sum.openEvents} open event${sum.openEvents > 1 ? 's' : ''}`} /> : null}
      </Row>
      <SiteMap s={s} siteId={site} height={240} showOfficers={false} />
      <Col gap={8}>{poses.map((p) => <RobotRow key={p.robot.id} p={p} />)}</Col>
      <Btn kind="soft" icon="map-outline" label="Open control tower" onPress={() => router.push('/v2/control')} />
      <T v="caption" color={c.textFaint}>Positions update live from the fleet.</T>
    </Surface>
  );
}

const ACTION_LABEL: Record<RobotAction, string> = { patrol: 'Patrol', clean: 'Clean', goto: 'Go to', pause: 'Pause', resume: 'Resume', return_dock: 'Return to dock' };

export function RobotCommandCard({ threadId, msg }: CardProps) {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const now = useNow(2000);
  const dispatch = useApp((x) => x.dispatch);
  const d = (msg.data ?? {}) as { action: RobotAction; robotId?: string | null; robotKind?: 'patrol' | 'cleaning' | null; zoneId?: string | null; done?: string };
  const site = me.siteId === 'HQ' ? 'CNP' : me.siteId;
  const zones = s.sites.find((x) => x.id === site)!.zones;
  const wantKind = d.action === 'patrol' ? 'patrol' : d.action === 'clean' ? 'cleaning' : d.robotKind ?? null;
  const [zoneId, setZoneId] = useState<string | null>(d.zoneId ?? null);
  const candidates = s.robots.filter((r) => r.siteId === site && (!wantKind || r.kind === wantKind));
  // default robot: the one asked for, else the nearest suitable one to the target zone
  const target = zoneOf(s, site, zoneId ?? undefined);
  const nearest = [...candidates].sort((a, b) => {
    const pa = robotPose(s, a.id, now), pb = robotPose(s, b.id, now);
    return zoneDistance(pa.zone, target) - zoneDistance(pb.zone, target);
  })[0];
  const [robotId, setRobotId] = useState<string | undefined>(d.robotId ?? nearest?.id);
  const pose = robotId ? robotPose(s, robotId, now) : undefined;
  const needsZone = ['patrol', 'clean', 'goto'].includes(d.action);
  if (d.done) return <Surface tone="pass" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Icon name="checkmark-circle" color={c.pass} /><T v="smallStrong" style={{ flex: 1 }}>{d.done}</T><Btn size="sm" kind="ghost" label="Watch" onPress={() => router.push('/v2/control')} /></Surface>;
  return (
    <Surface style={{ gap: 12 }}>
      <T v="label">Robot</T>
      <Row wrap gap={6}>{candidates.map((r) => <Chip key={r.id} label={r.name} selected={robotId === r.id} onPress={() => setRobotId(r.id)} />)}</Row>
      {pose ? <RobotRow p={pose} /> : null}
      {needsZone ? (
        <>
          <T v="label">Where</T>
          <Row wrap gap={6}>{zones.map((z) => <Chip key={z.id} label={z.name} selected={zoneId === z.id} onPress={() => setZoneId(z.id)} />)}</Row>
        </>
      ) : null}
      <Btn size="lg" icon="navigate" label={`${ACTION_LABEL[d.action]}${robotId ? ` · ${robotId}` : ''}${needsZone && zoneId ? ` → ${zones.find((z) => z.id === zoneId)?.name}` : ''}`}
        disabled={!robotId || (needsZone && !zoneId)}
        onPress={() => {
          const r = dispatch({ type: 'robot.command', robotId: robotId!, action: d.action, zoneIds: zoneId ? [zoneId] : undefined, missionId: newId('MS') }, { confirm: true });
          if (r.ok) useChat.getState().patchData(threadId, msg.id, { done: `${robotId}: ${ACTION_LABEL[d.action].toLowerCase()}${zoneId ? ` ${zones.find((z) => z.id === zoneId)?.name}` : ''}. Sent.` });
        }} />
      <T v="caption" color={c.textFaint}>Robot commands go through the action layer and are logged with your name.</T>
    </Surface>
  );
}

/** Pushed into the officer's chat when the control tower tasks them with a robot detection. */
export function RobotTaskCard({ msg }: CardProps) {
  const c = useV2();
  const s = useView();
  const open = usePanel((x) => x.open);
  const d = (msg.data ?? {}) as { eventId?: string; workOrderId?: string };
  const e = s.robotEvents.find((x) => x.id === d.eventId);
  const wo = s.workOrders.find((w) => w.id === (d.workOrderId ?? e?.workOrderId));
  if (!e) return <Surface><T v="small">{msg.text}</T></Surface>;
  const robot = s.robots.find((r) => r.id === e.robotId);
  const done = e.status === 'resolved' || wo?.status === 'pending_approval' || wo?.status === 'closed';
  return (
    <Surface tone={done ? 'pass' : 'orange'} style={{ gap: 10 }}>
      <Row gap={8}><Icon name="hardware-chip-outline" color={done ? c.pass : c.orange} /><T v="label" color={done ? c.pass : c.orange}>{robot?.name} · {ago(e.at)}</T></Row>
      <T v="bodyStrong">{e.label}</T>
      <T v="small" color={c.text}>{e.detail}</T>
      {e.imageUri ? <SceneImage uri={e.imageUri} height={200} /> : null}
      <Row gap={6}><Icon name="location-outline" size={16} /><T v="caption">{s.sites.find((x) => x.id === robot?.siteId)?.zones.find((z) => z.id === e.zoneId)?.name} · {robot?.kind === 'cleaning' ? `${robot.id} is holding position as a marker` : `${robot?.id} is watching`}</T></Row>
      {done ? <Badge tone="pass" icon="checkmark" label="Handled · robot back to work" /> : (
        <Row wrap>
          {wo ? <Btn icon="open-outline" label="Open task" onPress={() => open({ kind: 'wo', id: wo.id })} /> : null}
          {e.suggestedSopId ? <Btn kind="ghost" icon="document-text-outline" label={e.suggestedSopId} onPress={() => open({ kind: 'doc', id: e.suggestedSopId! })} /> : null}
        </Row>
      )}
    </Surface>
  );
}

/** Control tower: task the nearest officer with a robot detection (supervisor/HQ). */
export function taskNearest(eventId: string, officerId?: string) {
  const app = useApp.getState();
  const s = app.view!;
  const e = s.robotEvents.find((x) => x.id === eventId)!;
  const robot = s.robots.find((r) => r.id === e.robotId)!;
  const z = zoneOf(s, robot.siteId, e.zoneId);
  const pick = officerId ?? s.officers
    .filter((o) => o.siteId === robot.siteId && o.role === 'officer' && o.shiftId === 'night' && o.status !== 'break' && o.status !== 'blocked')
    .sort((a, b) => zoneDistance(zoneOf(s, a.siteId, a.zoneId), z) - zoneDistance(zoneOf(s, b.siteId, b.zoneId), z))[0]?.id;
  if (!pick) return { ok: false as const };
  const r = app.dispatch({ type: 'robot.task', eventId, officerId: pick, recordId: newRecordNumber('CWO') }, { confirm: true });
  return { ...r, officerId: pick };
}
