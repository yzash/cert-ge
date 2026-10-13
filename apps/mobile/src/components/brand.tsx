import React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';

const LOGO = require('../../assets/images/certis-logo.png');
/** trimmed logo aspect ratio (width / height) */
export const LOGO_RATIO = 1177 / 330;

/**
 * The Certis wordmark. The navy text disappears on dark backgrounds, so `onDark` puts it on a
 * white rounded chip.
 */
export function CertisLogo({ height = 24, onDark, style }: { height?: number; onDark?: boolean; style?: StyleProp<ViewStyle> }) {
  const img = <Image source={LOGO} accessibilityLabel="Certis" style={{ height, width: height * LOGO_RATIO }} resizeMode="contain" />;
  if (!onDark) return <View style={style}>{img}</View>;
  return <View style={[{ backgroundColor: '#fff', borderRadius: height * 0.35, paddingHorizontal: height * 0.4, paddingVertical: height * 0.25, alignSelf: 'flex-start' }, style]}>{img}</View>;
}
