import { fixtureImages, robotSnapshots } from '@mozart/fixtures';
import React, { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import { Button, Icon, Row, Txt } from './ui';

/** Renders fixture://img-* scenes (SVG) or real photos (data:/file: URIs). */
export function SceneImage({ uri, style, height = 220 }: { uri: string; style?: StyleProp<ViewStyle>; height?: number }) {
  const c = useTheme();
  const fxId = uri.startsWith('fixture://') ? uri.slice(10) : '';
  const fx = fixtureImages.find((f) => f.id === fxId) ?? (robotSnapshots[fxId] ? { id: fxId, label: fxId, svg: robotSnapshots[fxId] } : undefined);
  const box: StyleProp<ViewStyle> = [{ height, width: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' }, style];
  if (uri.startsWith('fixture://') && !fx) {
    return (
      <View style={[box, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt }]}>
        <Icon name="image-outline" color={c.textMuted} />
        <Txt v="caption">Photo (stored on device)</Txt>
      </View>
    );
  }
  if (fx) {
    if (Platform.OS === 'web') {
      // react-native-web's Image does not paint SVG data URIs reliably; use a plain <img>.
      const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fx.svg)}`;
      return (
        <View style={box}>
          {React.createElement('img', { src, alt: fx.label, style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })}
        </View>
      );
    }
    return (
      <View style={box}>
        <SvgXml xml={fx.svg} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
      </View>
    );
  }
  return (
    <View style={box}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  );
}

/** Finger / mouse signature capture. Value is an SVG path string prefixed with "svg:". */
export function SignaturePad({ onChange, height = 150 }: { onChange: (sig: string | null) => void; height?: number }) {
  const c = useTheme();
  const [paths, setPaths] = useState<string[]>([]);
  const cur = useRef<string>('');
  const [, force] = useState(0);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current = `M${x.toFixed(1)},${y.toFixed(1)}`;
          force((n) => n + 1);
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current += ` L${x.toFixed(1)},${y.toFixed(1)}`;
          force((n) => n + 1);
        },
        onPanResponderRelease: () => {
          const p = cur.current;
          cur.current = '';
          setPaths((prev) => {
            const next = [...prev, p];
            onChange(`svg:${next.join(' ')}`);
            return next;
          });
        },
      }),
    [onChange],
  );
  return (
    <View style={{ gap: 6 }}>
      <View
        {...responder.panHandlers}
        accessibilityLabel="Signature pad"
        style={{ height, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.mode === 'dark' ? '#0B1626' : '#fff', overflow: 'hidden' }}
      >
        <Svg width="100%" height="100%" pointerEvents="none">
          {[...paths, cur.current].filter(Boolean).map((d, i) => (
            <Path key={i} d={d} stroke={c.text} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
        {!paths.length && !cur.current ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' }}>
            <Txt v="caption">Sign here</Txt>
          </View>
        ) : null}
      </View>
      <Row style={{ justifyContent: 'flex-end' }}>
        <Button size="sm" kind="ghost" label="Clear" icon="refresh" onPress={() => { setPaths([]); onChange(null); }} />
      </Row>
    </View>
  );
}

export function SignatureView({ sig, height = 70 }: { sig?: string; height?: number }) {
  const c = useTheme();
  if (!sig) return null;
  if (!sig.startsWith('svg:')) return <Txt v="small" style={{ fontStyle: 'italic' }}>{sig.replace('signed:', 'Signed: ')}</Txt>;
  return (
    <View style={{ height, borderRadius: 8, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 340 150" preserveAspectRatio="xMinYMid meet">
        <Path d={sig.slice(4)} stroke={c.text} strokeWidth={2.5} fill="none" />
      </Svg>
    </View>
  );
}
