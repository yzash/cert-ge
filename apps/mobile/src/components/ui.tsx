import Ionicons from '@expo/vector-icons/Ionicons';
import { radius, space, touch, type as T } from '@mozart/ui';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const c = useTheme();
  return <Ionicons name={name} size={size} color={color ?? c.text} />;
}

type Variant = 'h1' | 'h2' | 'title' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'mono' | 'label';

export function Txt({ children, v = 'body', color, style, numberOfLines, selectable }: {
  children: React.ReactNode; v?: Variant; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number; selectable?: boolean;
}) {
  const c = useTheme();
  const base: TextStyle = {
    h1: { fontSize: T.h1, fontWeight: '800' as const, letterSpacing: -0.5 },
    h2: { fontSize: T.h2, fontWeight: '800' as const, letterSpacing: -0.3 },
    title: { fontSize: T.title, fontWeight: '700' as const },
    body: { fontSize: T.body, lineHeight: 23 },
    bodyStrong: { fontSize: T.body, fontWeight: '700' as const, lineHeight: 23 },
    small: { fontSize: T.small, lineHeight: 20 },
    caption: { fontSize: T.caption, lineHeight: 18 },
    mono: { fontSize: T.small, fontFamily: 'monospace' },
    label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  }[v];
  const muted = v === 'small' || v === 'caption' || v === 'label';
  return (
    <Text selectable={selectable} numberOfLines={numberOfLines} style={[{ color: color ?? (muted ? c.textMuted : c.text) }, base, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, onPress, style, tone, accessibilityLabel }: {
  children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; tone?: 'pass' | 'attention' | 'fail' | 'info' | 'accent';
  accessibilityLabel?: string;
}) {
  const c = useTheme();
  const toneColor = tone === 'accent' ? c.primary : tone ? c[tone] : undefined;
  const inner = (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: toneColor ?? c.border }, toneColor && { borderLeftWidth: 4 }, style]}>
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      {inner}
    </Pressable>
  );
}

export function Button({ label, onPress, kind = 'primary', icon, disabled, loading, size = 'md', style, accessibilityLabel }: {
  label: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; icon?: IconName; disabled?: boolean; loading?: boolean;
  size?: 'md' | 'lg' | 'sm'; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const c = useTheme();
  const bg = { primary: c.primary, secondary: c.surfaceAlt, ghost: 'transparent', danger: c.fail, success: c.pass }[kind];
  const fg = { primary: c.primaryText, secondary: c.text, ghost: c.text, danger: '#fff', success: '#04210F' }[kind];
  const h = size === 'lg' ? touch.large : size === 'sm' ? 38 : touch.min + 4;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: h, paddingHorizontal: size === 'sm' ? space.md : space.lg, borderRadius: radius.md, backgroundColor: bg,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          borderWidth: kind === 'ghost' || kind === 'secondary' ? 1 : 0, borderColor: c.border,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: size === 'sm' ? 14 : T.body }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color, size = 22, badge }: { icon: IconName; onPress: () => void; label: string; color?: string; size?: number; badge?: number }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={({ pressed }) => ({ width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={size} color={color ?? c.text} />
      {badge ? (
        <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
          <Text style={{ color: c.primaryText, fontSize: 10, fontWeight: '800' }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const PILL: Record<string, 'info' | 'accent' | 'attention' | 'pass' | 'muted' | 'fail' | 'purple'> = {
  assignment: 'info', acknowledged: 'purple', in_progress: 'accent', on_hold: 'muted', pending_approval: 'attention', closed: 'pass',
  received: 'info', under_review: 'attention', decided: 'pass', open: 'fail', investigating: 'attention', resolved: 'pass',
  pass: 'pass', attention: 'attention', fail: 'fail', low: 'muted', medium: 'info', high: 'attention', critical: 'fail', pending: 'attention',
};

export function Pill({ label, tone, status, icon }: { label: string; tone?: 'info' | 'accent' | 'attention' | 'pass' | 'muted' | 'fail' | 'purple'; status?: string; icon?: IconName }) {
  const c = useTheme();
  const t = tone ?? (status ? PILL[status] : undefined) ?? 'info';
  const color = { info: c.info, accent: c.primary, attention: c.attention, pass: c.pass, muted: c.textMuted, fail: c.fail, purple: '#B58CFF' }[t];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '66', alignSelf: 'flex-start' }}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: selected ? c.primary : c.surfaceAlt, borderWidth: 1, borderColor: selected ? c.primary : c.border, opacity: pressed ? 0.8 : 1,
      })}>
      {icon ? <Ionicons name={icon} size={16} color={selected ? c.primaryText : c.text} /> : null}
      <Text style={{ color: selected ? c.primaryText : c.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, gap = space.sm, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Section({ title, right, children, style }: { title: string; right?: React.ReactNode; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: space.sm }, style]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="label">{title}</Txt>
        {right}
      </Row>
      {children}
    </View>
  );
}

export function Field({ label, hint, warn, error, ...props }: TextInputProps & { label: string; hint?: string; warn?: boolean; error?: boolean }) {
  const c = useTheme();
  const border = error ? c.fail : warn ? c.attention : c.border;
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="small" color={error ? c.fail : warn ? c.attention : c.textMuted} style={{ fontWeight: '600' }}>{label}</Txt>
        {hint ? <Txt v="caption" color={error ? c.fail : warn ? c.attention : c.textMuted}>{hint}</Txt> : null}
      </Row>
      <TextInput
        placeholderTextColor={c.textMuted}
        {...props}
        style={[{ minHeight: touch.min + 4, borderRadius: radius.md, borderWidth: warn || error ? 2 : 1, borderColor: border, backgroundColor: c.surfaceAlt, color: c.text, paddingHorizontal: space.md, paddingVertical: 10, fontSize: T.body }, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export function Divider() {
  const c = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: space.sm }} />;
}

export function Empty({ icon = 'checkmark-done-outline', text }: { icon?: IconName; text: string }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: space.xl, gap: space.sm }}>
      <Ionicons name={icon} size={32} color={c.textMuted} />
      <Txt v="small" style={{ textAlign: 'center' }}>{text}</Txt>
    </View>
  );
}

/** Header bar: back / title / right actions. */
export function Header({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: space.sm, paddingBottom: 6, backgroundColor: c.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
      <Row style={{ minHeight: touch.min }}>
        {back ? <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : <View style={{ width: space.sm }} />}
        <View style={{ flex: 1 }}>
          <Txt v="title" numberOfLines={1}>{title}</Txt>
          {subtitle ? <Txt v="caption" numberOfLines={1}>{subtitle}</Txt> : null}
        </View>
        {right}
      </Row>
    </View>
  );
}

/** Screen chrome: header and a scroll body. */
export function Screen({ title, subtitle, children, back, right, scroll = true, padded = true, footer }: {
  title?: string; subtitle?: string; children: React.ReactNode; back?: boolean; right?: React.ReactNode; scroll?: boolean; padded?: boolean; footer?: React.ReactNode;
}) {
  const c = useTheme();
  const body = <View style={{ padding: padded ? space.lg : 0, gap: space.lg, paddingBottom: padded ? 120 : 0 }}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {title !== undefined ? <Header title={title} subtitle={subtitle} back={back} right={right} /> : null}
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>{body}</ScrollView> : <View style={{ flex: 1 }}>{children}</View>}
      {footer}
    </View>
  );
}

export function KeyValue({ k, v, color }: { k: string; v: React.ReactNode; color?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={space.md}>
      <Txt v="small">{k}</Txt>
      {typeof v === 'string' ? <Txt v="small" color={color} style={{ flex: 1, textAlign: 'right', fontWeight: '600' }}>{v}</Txt> : v}
    </Row>
  );
}

export function ConfidenceTag({ value }: { value?: number }) {
  const c = useTheme();
  if (value === undefined) return null;
  const pct = Math.round(value * 100);
  const color = value === 0 ? c.fail : value < 0.7 ? c.attention : c.pass;
  return <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{value === 0 ? 'Not inferred' : `${pct}%`}</Text>;
}

export function ModeBadge({ fallback, mode }: { fallback?: boolean; mode?: string }) {
  if (fallback) return <Pill tone="attention" icon="warning-outline" label="LIVE failed · DEMO answer" />;
  return <Pill tone={mode === 'LIVE' ? 'pass' : 'muted'} label={mode === 'LIVE' ? 'LIVE · Gemini Enterprise' : 'DEMO'} />;
}
