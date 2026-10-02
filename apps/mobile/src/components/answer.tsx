import type { Citation } from '@mozart/schema';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/lib/theme';
import { Row, Txt } from './ui';

/** Answer text with inline [n] citation chips that open the source section. */
export function CitedText({ text, citations }: { text: string; citations: Citation[] }) {
  const c = useTheme();
  const parts = text.split(/(\[\d+\])/g);
  return (
    <Text style={{ color: c.text, fontSize: 16, lineHeight: 24 }}>
      {parts.map((p, i) => {
        const m = /^\[(\d+)\]$/.exec(p);
        if (!m) return <Text key={i}>{p}</Text>;
        const cit = citations.find((x) => x.n === Number(m[1]));
        return (
          <Text
            key={i}
            accessibilityRole="link"
            onPress={() => cit && router.push({ pathname: '/doc/[id]', params: { id: cit.docId, section: cit.sectionId } })}
            style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}
          >
            {` [${m[1]}]`}
          </Text>
        );
      })}
    </Text>
  );
}

export function CitationChips({ citations }: { citations: Citation[] }) {
  const c = useTheme();
  if (!citations.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Txt v="label">Sources</Txt>
      {citations.map((cit) => (
        <Pressable key={cit.n} accessibilityRole="link" onPress={() => router.push({ pathname: '/doc/[id]', params: { id: cit.docId, section: cit.sectionId } })}
          style={({ pressed }) => ({ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, minHeight: 44, borderRadius: 10, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.8 : 1 })}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.primaryText, fontWeight: '800', fontSize: 12 }}>{cit.n}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="small" color={c.text} numberOfLines={1} style={{ fontWeight: '700' }}>{cit.title}</Txt>
            <Txt v="caption" numberOfLines={1}>{cit.section}</Txt>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function TypingDots() {
  const c = useTheme();
  return (
    <Row gap={4}>
      {[0, 1, 2].map((i) => <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.textMuted, opacity: 0.4 + i * 0.25 }} />)}
    </Row>
  );
}
