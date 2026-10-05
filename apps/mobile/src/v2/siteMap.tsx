/**
 * Live site plan, drawn as level bands (Roof at the top, B3 at the bottom). Zones sit in their
 * level's band at their plan x; robots move along their missions (pure simulator, so every tab
 * agrees); officers are dots under their zone; open robot events pulse.
 */
import { fleet, nearestZone, type RobotPose } from '@mozart/actions';
import type { DemoState, Zone } from '@mozart/schema';
import { v2 } from '@mozart/ui';
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useNow } from '@/lib/hooks';
import { T, useV2 } from './ui';

const ORDER = ['R', 'L5', 'L4', 'L3', 'L2', 'L1', 'B1', 'B2', 'B3'];
const FONT = 'Inter, system-ui, -apple-system, Segoe UI, sans-serif';

export function SiteMap({ s, siteId, height = 380, selected, onSelect, showOfficers = true, focusRobot }: {
  s: DemoState; siteId: string; height?: number; selected?: string | null; onSelect?: (robotId: string) => void; showOfficers?: boolean; focusRobot?: string;
}) {
  const c = useV2();
  const now = useNow(1000);
  const zones = s.sites.find((x) => x.id === siteId)!.zones;
  const levels = ORDER.filter((l) => zones.some((z) => z.level === l));
  const W = 900;
  const LABEL = 54;
  const band = 84;
  const H = levels.length * band + 12;
  const xs = zones.map((z) => z.x);
  const minX = Math.min(...xs) - 20, maxX = Math.max(...xs) + 20;
  const px = (x: number) => LABEL + 70 + ((x - minX) / (maxX - minX)) * (W - LABEL - 140);
  const bandY = (level: string) => 6 + levels.indexOf(level) * band + band / 2;
  // Lay zones out left-to-right within each level, never closer than one box apart.
  const layoutX = new Map<string, number>();
  for (const l of levels) {
    let prev = -Infinity;
    for (const z of zones.filter((x) => x.level === l).sort((a, b) => a.x - b.x)) {
      const x = Math.min(W - 80, Math.max(px(z.x), prev + 142));
      layoutX.set(z.id, x);
      prev = x;
    }
  }
  const zx = (z: Zone) => layoutX.get(z.id) ?? px(z.x);
  const zoneY = (z: Zone) => bandY(z.level);
  const poses: RobotPose[] = fleet(s, siteId, now).filter((p) => !focusRobot || p.robot.id === focusRobot);
  const events = s.robotEvents.filter((e) => (e.status === 'open' || e.status === 'tasked') && s.robots.find((r) => r.id === e.robotId)?.siteId === siteId);
  const officers = showOfficers ? s.officers.filter((o) => o.siteId === siteId && o.role === 'officer' && o.shiftId === 'night' && o.zoneId) : [];
  const pulse = (now / 1000) % 2 < 1;
  const robotXY = (p: RobotPose) => {
    const z = p.zone ?? nearestZone(zones, p)!;
    const dy = 26 + Math.max(-4, Math.min(4, (p.y - z.y) * 0.3)); // robots travel along the corridor under the room
    const dx = Math.max(-56, Math.min(56, (p.x - z.x) * 3));
    return { x: zx(z) + dx, y: zoneY(z) + dy };
  };

  return (
    <View style={{ gap: 8 }}>
    <View style={{ width: '100%', aspectRatio: W / H, maxHeight: height * 1.6, borderRadius: v2.radius.lg, backgroundColor: c.mode === 'dark' ? '#0C1729' : '#F3F6FA', overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {levels.map((l, i) => (
          <G key={l}>
            <Rect x={0} y={6 + i * band} width={W} height={band} fill={i % 2 ? 'transparent' : c.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(11,42,74,0.025)'} />
            <Line x1={LABEL} x2={W - 8} y1={6 + i * band} y2={6 + i * band} stroke={c.border} strokeWidth={1} />
            <SvgText x={14} y={bandY(l) + 5} fontSize={14} fontWeight="600" fontFamily={FONT} fill={c.textMuted}>{l}</SvgText>
          </G>
        ))}
        {zones.map((z) => (
          <G key={z.id}>
            <Rect x={zx(z) - 64} y={zoneY(z) - 18} width={128} height={34} rx={12} fill={c.surface} stroke={c.border} strokeWidth={1.5} />
            <SvgText x={zx(z)} y={zoneY(z) + 3} fontSize={12} fontFamily={FONT} fill={c.text} textAnchor="middle">{z.name.replace(/^(L\d|B\d|R|Roof)\s/, '').replace('Retail ', '').replace('Terminal ', '').replace('Fire Command Centre', 'FCC').slice(0, 19)}</SvgText>
          </G>
        ))}
        {officers.map((o, i) => {
          const z = zones.find((x) => x.id === o.zoneId)!;
          const same = officers.filter((x) => x.zoneId === o.zoneId);
          const k = same.indexOf(o);
          return <Circle key={o.id} cx={zx(z) - 50 + k * 11} cy={zoneY(z) - 26} r={4} fill={o.status === 'blocked' ? c.fail : c.navy} opacity={0.85} />;
        })}
        {events.map((e) => {
          const z = zones.find((x) => x.id === e.zoneId);
          if (!z) return null;
          const col = e.status === 'open' ? c.fail : c.warn;
          return (
            <G key={e.id}>
              <Circle cx={zx(z) + 60} cy={zoneY(z) - 18} r={pulse ? 13 : 8} fill={col} opacity={0.2} />
              <Circle cx={zx(z) + 60} cy={zoneY(z) - 18} r={6} fill={col} stroke={c.surface} strokeWidth={2} />
            </G>
          );
        })}
        {poses.map((p) => {
          const { x, y } = robotXY(p);
          const isSel = selected === p.robot.id;
          const col = p.status === 'paused' ? c.warn : p.status === 'charging' || p.status === 'docked' ? c.textFaint : p.robot.kind === 'patrol' ? c.navy : c.orange;
          return (
            <G key={p.robot.id} onPress={() => onSelect?.(p.robot.id)}>
              {isSel ? <Circle cx={x} cy={y} r={20} fill={col} opacity={0.18} /> : null}
              <Rect x={x - 10} y={y - 10} width={20} height={20} rx={p.robot.kind === 'patrol' ? 10 : 5} fill={col} stroke={c.surface} strokeWidth={2.5} />
              <Rect x={x + 12} y={y - 8} width={40} height={16} rx={8} fill={c.raised} stroke={c.border} />
              <SvgText x={x + 32} y={y + 4} fontSize={10} fontWeight="700" fontFamily={FONT} fill={c.text} textAnchor="middle">{p.robot.id}</SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 4 }}>
        {([['Patrol robot', c.navy, 9], ['Cleaning robot', c.orange, 3], ['Paused', c.warn, 3], ['Officer', c.navy, 6], ['Event', c.fail, 6]] as const).map(([l, col, r]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 9, height: 9, borderRadius: r, backgroundColor: col }} />
            <T v="caption">{l}</T>
          </View>
        ))}
      </View>
    </View>
  );
}
