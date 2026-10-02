import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import { Txt } from './ui';

type Week = { weekOf: string; count: number; sentiment: number };

const wk = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });

/** Sparkline of weekly log counts (single series: no legend; the row label names it). */
export function Sparkbars({ weeks, width = 96, height = 28 }: { weeks: Week[]; width?: number; height?: number }) {
  const c = useTheme();
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const bw = width / weeks.length;
  return (
    <Svg width={width} height={height} accessibilityLabel={`Weekly logs: ${weeks.map((w) => w.count).join(', ')}`}>
      {weeks.map((w, i) => {
        const h = Math.max(w.count ? 3 : 1, (w.count / max) * (height - 2));
        return <Rect key={i} x={i * bw + 1} y={height - h} width={bw - 2} height={h} rx={2} fill={w.count ? c.info : c.border} />;
      })}
    </Svg>
  );
}

/**
 * Two stacked small charts sharing the week axis (never a dual axis):
 * logs per week as bars, and mean sentiment per week as a line against a zero baseline.
 * Tap/hover a week to read its values.
 */
export function WeeklyCharts({ weeks, width }: { weeks: Week[]; width: number }) {
  const c = useTheme();
  const [sel, setSel] = useState<number>(weeks.length - 1);
  const padL = 28;
  const plotW = width - padL - 8;
  const bw = plotW / weeks.length;
  const barH = 90;
  const lineH = 70;
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const yS = (v: number) => 8 + ((1 - v) / 2) * (lineH - 16); // sentiment -1..1
  const pts = weeks.map((w, i) => ({ x: padL + i * bw + bw / 2, y: yS(w.count ? w.sentiment : 0), has: w.count > 0 }));
  const d = pts.filter((p) => p.has).map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const s = weeks[sel];

  return (
    <View style={{ gap: 6 }}>
      <Txt v="caption">Logs per week</Txt>
      <Svg width={width} height={barH + 18}>
        <Line x1={padL} x2={width - 8} y1={barH} y2={barH} stroke={c.border} strokeWidth={1} />
        <SvgText x={padL - 6} y={10} fontSize={10} fill={c.textMuted} textAnchor="end">{max}</SvgText>
        <SvgText x={padL - 6} y={barH} fontSize={10} fill={c.textMuted} textAnchor="end">0</SvgText>
        {weeks.map((w, i) => {
          const h = (w.count / max) * (barH - 8);
          const x = padL + i * bw + 3;
          return (
            <React.Fragment key={i}>
              {h > 0 ? <Path d={`M${x},${barH} V${barH - h + 4} Q${x},${barH - h} ${x + 4},${barH - h} H${x + bw - 10} Q${x + bw - 6},${barH - h} ${x + bw - 6},${barH - h + 4} V${barH} Z`} fill={i === sel ? c.primary : c.info} /> : null}
              <SvgText x={padL + i * bw + bw / 2} y={barH + 14} fontSize={10} fill={i === sel ? c.text : c.textMuted} textAnchor="middle">{wk(w.weekOf)}</SvgText>
              <Rect x={padL + i * bw} y={0} width={bw} height={barH + 18} fill="transparent" onPress={() => setSel(i)} />
            </React.Fragment>
          );
        })}
      </Svg>
      <Txt v="caption">Mean sentiment (−1 to +1)</Txt>
      <Svg width={width} height={lineH}>
        <Line x1={padL} x2={width - 8} y1={yS(0)} y2={yS(0)} stroke={c.border} strokeDasharray="3 3" />
        <SvgText x={padL - 6} y={yS(0) + 3} fontSize={10} fill={c.textMuted} textAnchor="end">0</SvgText>
        <SvgText x={padL - 6} y={yS(-1) + 3} fontSize={10} fill={c.textMuted} textAnchor="end">−1</SvgText>
        {d ? <Path d={d} stroke={c.textMuted} strokeWidth={2} fill="none" /> : null}
        {pts.map((p, i) => (p.has ? <Circle key={i} cx={p.x} cy={p.y} r={i === sel ? 5 : 4} fill={i === sel ? c.primary : c.textMuted} stroke={c.surface} strokeWidth={2} onPress={() => setSel(i)} /> : null))}
        {weeks.map((_, i) => <Rect key={`h${i}`} x={padL + i * bw} y={0} width={bw} height={lineH} fill="transparent" onPress={() => setSel(i)} />)}
      </Svg>
      {s ? (
        <Pressable accessibilityRole="text">
          <Txt v="small" color={c.text}>Week of {wk(s.weekOf)}: {s.count} log{s.count === 1 ? '' : 's'}{s.count ? `, sentiment ${s.sentiment.toFixed(2)}` : ''}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
