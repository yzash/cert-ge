import { fleet, fleetSummary, newId, robotPose, zoneDistance, zoneOf } from '@mozart/actions';
import { robotEventPresets } from '@mozart/fixtures';
import { v2 } from '@mozart/ui';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SceneImage } from '@/components/media';
import { ago, officerName } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { useApp } from '@/store/app';
import { RobotRow, STATUS_LABEL, taskNearest } from '@/v2/cards/robots';
import { PageHeader, useWide } from '@/v2/shell';
import { SiteMap } from '@/v2/siteMap';
import { Badge, Btn, Chip, Col, Icon, Row, Surface, T, useV2 } from '@/v2/ui';

/** Control tower: live map of patrol + cleaning robots and officers, fleet commands, robot events → officer tasks. */
export default function ControlTower() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const now = useNow(1000);
  const wide = useWide();
  const dispatch = useApp((x) => x.dispatch);
  const site = 'CNP';
  const [sel, setSel] = useState<string | null>('CR-03');
  const [zoneFor, setZoneFor] = useState<string | null>(null);
  const sum = fleetSummary(s, site, now);
  const poses = fleet(s, site, now);
  const pose = sel ? robotPose(s, sel, now) : undefined;
  const zones = s.sites.find((x) => x.id === site)!.zones;
  const events = s.robotEvents.filter((e) => s.robots.find((r) => r.id === e.robotId)?.siteId === site).sort((a, b) => b.at.localeCompare(a.at));
  const cmd = (action: 'pause' | 'resume' | 'return_dock' | 'patrol' | 'clean' | 'goto', zoneIds?: string[]) =>
    dispatch({ type: 'robot.command', robotId: sel!, action, zoneIds, missionId: newId('MS') }, { confirm: true });

  const kpis: [string, string, string?][] = [
    ['Robots working', `${sum.working} of ${sum.total}`],
    ['Paused / holding', `${sum.paused}`, sum.paused ? c.warn : undefined],
    ['Charging', `${sum.charging}`],
    ['Open robot events', `${sum.openEvents}`, sum.openEvents ? c.fail : undefined],
    ['Area cleaned this run', `${sum.areaCleaned} m²`],
  ];

  const fleetPanel = (
    <Col gap={10}>
      <T v="label">Fleet</T>
      {poses.map((p) => <RobotRow key={p.robot.id} p={p} selected={sel === p.robot.id} onPress={() => { setSel(p.robot.id); setZoneFor(null); }} />)}
    </Col>
  );

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Control tower" subtitle="Canopy Mall · robots, officers and robot-raised events, live" right={<Badge tone="pass" icon="radio-outline" label="Live" />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: wide ? 32 : 12, paddingBottom: 60, gap: 16 }}>
        <Row wrap gap={10}>
          {kpis.map(([l, v, col]) => (
            <Surface key={l} style={{ flexGrow: 1, flexBasis: 150, gap: 2 }}>
              <T v="caption">{l}</T>
              <T v="title" color={col}>{v}</T>
            </Surface>
          ))}
        </Row>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          <Col gap={16} style={{ flex: 1, width: '100%' }}>
            <SiteMap s={s} siteId={site} height={wide ? 460 : 300} selected={sel} onSelect={(id) => setSel(id)} />
            {/* selected robot */}
            {pose ? (
              <Surface style={{ gap: 12 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Col gap={2}><T v="title">{pose.robot.name}</T><T v="caption">{pose.robot.model} · {pose.robot.capabilities.join(' · ')}</T></Col>
                  <Badge tone={pose.status === 'paused' ? 'warn' : 'pass'} label={STATUS_LABEL[pose.status]} />
                </Row>
                <T v="small" color={c.text}>At {pose.zone?.name} · battery {pose.battery}%{pose.mission ? ` · mission ${pose.mission.kind} ${pose.mission.waypoints.map((z) => zones.find((x) => x.id === z)?.name).join(' → ')}` : ''}{pose.pausedReason ? ` · ${pose.pausedReason}` : ''}</T>
                <Row wrap gap={8}>
                  {pose.status === 'paused' ? <Btn size="sm" kind="navy" icon="play" label="Resume" onPress={() => cmd('resume')} /> : pose.mission ? <Btn size="sm" kind="soft" icon="pause" label="Pause" onPress={() => cmd('pause')} /> : null}
                  <Btn size="sm" kind="soft" icon={pose.robot.kind === 'patrol' ? 'shield-outline' : 'water-outline'} label={pose.robot.kind === 'patrol' ? 'Patrol a zone' : 'Clean a zone'} onPress={() => setZoneFor(zoneFor ? null : 'task')} />
                  <Btn size="sm" kind="soft" icon="navigate-outline" label="Go to" onPress={() => setZoneFor(zoneFor ? null : 'goto')} />
                  <Btn size="sm" kind="ghost" icon="home-outline" label="Return to dock" onPress={() => cmd('return_dock')} />
                </Row>
                {zoneFor ? (
                  <Row wrap gap={6}>{zones.map((z) => <Chip key={z.id} label={z.name} onPress={() => { cmd(zoneFor === 'goto' ? 'goto' : pose.robot.kind === 'patrol' ? 'patrol' : 'clean', [z.id]); setZoneFor(null); }} />)}</Row>
                ) : null}
                <T v="caption" color={c.textFaint}>Commands are confirmed by you, logged, and sent through the fleet API.</T>
              </Surface>
            ) : null}
          </Col>
          <Col gap={16} style={{ width: wide ? 400 : '100%' }}>
            {/* events */}
            <Col gap={10}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="label">Robot events</T>
                <T v="caption">{events.filter((e) => e.status === 'open').length} open</T>
              </Row>
              {events.slice(0, 8).map((e) => {
                const robot = s.robots.find((r) => r.id === e.robotId)!;
                const z = zoneOf(s, site, e.zoneId);
                const nearest = s.officers.filter((o) => o.siteId === site && o.role === 'officer' && o.shiftId === 'night' && o.status !== 'break' && o.status !== 'blocked')
                  .sort((a, b) => zoneDistance(zoneOf(s, a.siteId, a.zoneId), z) - zoneDistance(zoneOf(s, b.siteId, b.zoneId), z))[0];
                return (
                  <Surface key={e.id} tone={e.status === 'open' ? (e.severity === 'high' ? 'fail' : 'warn') : undefined} style={{ gap: 8 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Row gap={6}><Icon name={e.kind === 'low_battery' ? 'battery-dead-outline' : e.kind === 'obstacle' ? 'remove-circle-outline' : 'eye-outline'} /><T v="smallStrong">{e.label}</T></Row>
                      <Badge tone={e.status === 'open' ? 'fail' : e.status === 'tasked' ? 'warn' : 'neutral'} label={e.status} />
                    </Row>
                    <T v="caption">{robot.name} · {z?.name} · {ago(e.at, now)}</T>
                    {e.status === 'open' || e.status === 'tasked' ? <T v="small" color={c.text}>{e.detail}</T> : null}
                    {e.imageUri && e.status === 'open' ? <SceneImage uri={e.imageUri} height={130} /> : null}
                    {e.status === 'tasked' ? <T v="caption">Tasked to {officerName(s, e.assigneeId)} · {e.workOrderId}</T> : null}
                    {e.status === 'open' && e.kind === 'detection' ? (
                      <Row wrap gap={6}>
                        <Btn size="sm" kind="navy" icon="person-outline" label={`Task ${nearest?.name.split(' ')[0] ?? 'nearest officer'}`} onPress={() => {
                          const r = taskNearest(e.id);
                          if (r.ok) useApp.getState().toast({ kind: 'success', title: `Tasked ${officerName(s, r.officerId)}`, body: `${e.label}: it’s in their chat now.` });
                        }} />
                        <Btn size="sm" kind="ghost" label="Dismiss" onPress={() => dispatch({ type: 'robot.dismiss', eventId: e.id })} />
                      </Row>
                    ) : null}
                  </Surface>
                );
              })}
            </Col>
            {/* presenter: make a robot see something */}
            <Surface style={{ gap: 8, borderStyle: 'dashed' }}>
              <T v="label">Demo: simulate a detection</T>
              {robotEventPresets.map((p) => (
                <Btn key={p.label} size="sm" kind="ghost" icon="flash-outline" label={`${p.robotId}: ${p.label}`} style={{ justifyContent: 'flex-start' }}
                  onPress={() => dispatch({ type: 'robot.event', event: { ...p, id: newId('RE'), at: new Date().toISOString(), status: 'open' } })} />
              ))}
            </Surface>
            {fleetPanel}
          </Col>
        </View>
        <T v="caption" color={c.textFaint} style={{ maxWidth: v2.chatWidth }}>Robot positions are simulated from each robot’s mission in this demo. In production they come from the Mozart robotics fleet API; the screen reads the same data shape.</T>
      </ScrollView>
    </View>
  );
}
