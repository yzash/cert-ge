/** v2 primitives: quiet surfaces, pill controls, Inter type, gentle motion. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { v2, v2Dark, v2Light, type V2Palette } from '@mozart/ui';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator, Animated, Platform, Pressable, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useApp } from '@/store/app';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function useV2(): V2Palette {
  const mode = useApp((s) => s.settings.v2Theme ?? 'light');
  return mode === 'dark' ? v2Dark : v2Light;
}

type Variant = 'display' | 'h2' | 'title' | 'lead' | 'body' | 'bodyStrong' | 'small' | 'smallStrong' | 'caption' | 'label' | 'mono';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontSize: v2.size.display, fontFamily: v2.font.semibold, letterSpacing: -1, lineHeight: 48 },
  h2: { fontSize: v2.size.h2, fontFamily: v2.font.semibold, letterSpacing: -0.5, lineHeight: 32 },
  title: { fontSize: v2.size.title, fontFamily: v2.font.semibold, letterSpacing: -0.2, lineHeight: 26 },
  lead: { fontSize: v2.size.lead, fontFamily: v2.font.regular, lineHeight: 27 },
  body: { fontSize: v2.size.body, fontFamily: v2.font.regular, lineHeight: 24 },
  bodyStrong: { fontSize: v2.size.body, fontFamily: v2.font.semibold, lineHeight: 24 },
  small: { fontSize: v2.size.small, fontFamily: v2.font.regular, lineHeight: 20 },
  smallStrong: { fontSize: v2.size.small, fontFamily: v2.font.semibold, lineHeight: 20 },
  caption: { fontSize: v2.size.caption, fontFamily: v2.font.regular, lineHeight: 18 },
  label: { fontSize: 12, fontFamily: v2.font.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  mono: { fontSize: 13, fontFamily: Platform.OS === 'web' ? 'ui-monospace, Menlo, monospace' : 'monospace' },
};

export function T({ children, v = 'body', color, style, numberOfLines, selectable }: {
  children: React.ReactNode; v?: Variant; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number; selectable?: boolean;
}) {
  const c = useV2();
  const muted = v === 'caption' || v === 'label' || v === 'small';
  return <Text selectable={selectable} numberOfLines={numberOfLines} style={[{ color: color ?? (muted ? c.textMuted : c.text) }, VARIANTS[v], style]}>{children}</Text>;
}

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useV2();
  return <Ionicons name={name} size={size} color={color ?? c.textMuted} />;
}

export function Row({ children, gap = 8, style, wrap, align = 'center' }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean; align?: ViewStyle['alignItems'] }) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Col({ children, gap = 8, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

/** Card surface used inside chat and pages. */
export function Surface({ children, style, onPress, tone, padded = true, accessibilityLabel }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'orange' | 'pass' | 'warn' | 'fail' | 'info'; padded?: boolean; accessibilityLabel?: string;
}) {
  const c = useV2();
  const toneBg = tone ? { orange: c.orangeSoft, pass: c.passSoft, warn: c.warnSoft, fail: c.failSoft, info: c.infoSoft }[tone] : c.surface;
  const base: StyleProp<ViewStyle> = [{
    backgroundColor: toneBg, borderRadius: v2.radius.lg, borderWidth: 1, borderColor: tone ? 'transparent' : c.border,
    padding: padded ? v2.space.lg : 0, ...(Platform.OS === 'web' ? { boxShadow: `0 1px 2px ${c.shadow}` } : {}),
  } as ViewStyle, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [base, { opacity: pressed ? 0.85 : 1, borderColor: hovered ? c.borderStrong : (tone ? 'transparent' : c.border) }]}>
      {children}
    </Pressable>
  );
}

export function Btn({ label, onPress, kind = 'primary', icon, disabled, loading, size = 'md', style, accessibilityLabel }: {
  label: string; onPress?: () => void; kind?: 'primary' | 'navy' | 'soft' | 'ghost' | 'danger'; icon?: IconName; disabled?: boolean; loading?: boolean;
  size?: 'sm' | 'md' | 'lg'; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const c = useV2();
  const bg = { primary: c.orange, navy: c.navy, soft: c.sunken, ghost: 'transparent', danger: c.fail }[kind];
  const fg = { primary: c.onOrange, navy: c.onNavy, soft: c.text, ghost: c.text, danger: '#fff' }[kind];
  const h = size === 'lg' ? 52 : size === 'sm' ? 36 : v2.touch;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [{
        minHeight: h, paddingHorizontal: size === 'sm' ? 14 : 20, borderRadius: v2.radius.pill, backgroundColor: bg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        borderWidth: kind === 'ghost' ? 1 : 0, borderColor: c.border,
      }, style]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: v2.font.semibold, fontSize: size === 'sm' ? 14 : 15 }}>{label}</Text>
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, label, color, size = 20, badge, filled }: { icon: IconName; onPress: () => void; label: string; color?: string; size?: number; badge?: number; filled?: boolean }) {
  const c = useV2();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({ width: v2.touch, height: v2.touch, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? c.sunken : hovered ? c.sunken : 'transparent', opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name={icon} size={size} color={color ?? c.textMuted} />
      {badge ? (
        <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: c.onOrange, fontSize: 10, fontFamily: v2.font.bold }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const c = useV2();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        minHeight: 38, paddingHorizontal: 14, borderRadius: v2.radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: selected ? c.navy : hovered ? c.sunken : c.surface, borderWidth: 1, borderColor: selected ? c.navy : c.border, opacity: pressed ? 0.8 : 1,
      })}>
      {icon ? <Ionicons name={icon} size={15} color={selected ? c.onNavy : c.textMuted} /> : null}
      <Text style={{ color: selected ? c.onNavy : c.text, fontFamily: v2.font.medium, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'orange' | 'pass' | 'warn' | 'fail' | 'info' | 'navy'; icon?: IconName }) {
  const c = useV2();
  const map = {
    neutral: [c.sunken, c.textMuted], orange: [c.orangeSoft, c.orange], pass: [c.passSoft, c.pass], warn: [c.warnSoft, c.warn],
    fail: [c.failSoft, c.fail], info: [c.infoSoft, c.info], navy: [c.navySoft, c.navy],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: v2.radius.pill, backgroundColor: bg, alignSelf: 'flex-start' }}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 12, fontFamily: v2.font.semibold }}>{label}</Text>
    </View>
  );
}

export function Field({ label, hint, warn, ...props }: TextInputProps & { label?: string; hint?: string; warn?: boolean }) {
  const c = useV2();
  return (
    <View style={{ gap: 6, flexGrow: 1 }}>
      {label ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="smallStrong" color={warn ? c.warn : c.textMuted}>{label}</T>
          {hint ? <T v="caption" color={warn ? c.warn : c.textFaint}>{hint}</T> : null}
        </Row>
      ) : null}
      <TextInput
        placeholderTextColor={c.textFaint}
        {...props}
        style={[{
          minHeight: v2.touch, borderRadius: v2.radius.md, borderWidth: warn ? 2 : 1, borderColor: warn ? c.warn : c.border, backgroundColor: c.surface,
          color: c.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, fontFamily: v2.font.regular,
          ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
        } as TextStyle, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useV2();
  return <View style={[{ height: 1, backgroundColor: c.border }, style]} />;
}

export function Avatar({ initials, size = 32, tone = 'navy' }: { initials: string; size?: number; tone?: 'navy' | 'orange' }) {
  const c = useV2();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone === 'navy' ? c.navy : c.orange, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: tone === 'navy' ? c.onNavy : c.onOrange, fontFamily: v2.font.semibold, fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Meter({ value, tone = 'navy', height = 6 }: { value: number; tone?: 'navy' | 'orange' | 'pass' | 'warn' | 'fail'; height?: number }) {
  const c = useV2();
  const color = { navy: c.navy, orange: c.orange, pass: c.pass, warn: c.warn, fail: c.fail }[tone];
  return (
    <View style={{ height, borderRadius: height, backgroundColor: c.sunken, overflow: 'hidden', flexGrow: 1 }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

/** Mount animation: fade + small rise. */
export function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 260, delay, useNativeDriver: Platform.OS !== 'web' }).start();
  }, []);
  return <Animated.View style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }, style]}>{children}</Animated.View>;
}

/** Gradient headline on web (navy → orange), solid elsewhere. */
export function GradientText({ children, size = v2.size.display }: { children: React.ReactNode; size?: number }) {
  const c = useV2();
  const web = Platform.OS === 'web'
    ? ({ backgroundImage: `linear-gradient(90deg, ${c.mode === 'dark' ? '#9DB8DC' : '#0B2A4A'} 0%, #2F5D8F 45%, ${c.orange} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as unknown as TextStyle)
    : { color: c.navy };
  return <Text style={[{ fontSize: size, fontFamily: v2.font.semibold, letterSpacing: -1, lineHeight: size * 1.2 }, web]}>{children}</Text>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
      <T v="label">{children}</T>
      {right}
    </Row>
  );
}

export function KV({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between' }} align="flex-start" gap={12}>
      <T v="small">{k}</T>
      {typeof v === 'string' ? <T v={strong ? 'smallStrong' : 'small'} style={{ textAlign: 'right', flexShrink: 1 }} color={undefined}>{v}</T> : v}
    </Row>
  );
}
