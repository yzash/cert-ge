import { space } from '@mozart/ui';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { Header, Pill, Row, Txt } from '@/components/ui';
import { clock } from '@/lib/format';
import { useView } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';

/** Document viewer for citation chips: opens at the cited section and highlights it. */
export default function DocView() {
  const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
  const c = useTheme();
  const s = useView();
  const doc = s.docs.find((d) => d.id === id);
  const sop = s.sops.find((x) => x.id === id);
  const scroll = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  if (!doc) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Document" back /><Txt>Not found.</Txt></View>;
  const last = sop?.history[sop.history.length - 1];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={doc.title} subtitle={`${doc.kind === 'sop' ? 'SOP' : doc.kind === 'siteRule' ? 'Site rules' : doc.kind === 'notice' ? 'Notice' : doc.kind === 'manual' ? 'Manual' : 'Summary'}${doc.version ? ` · v${doc.version}` : ''}`} back />
      <ScrollView ref={scroll} contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 80 }}>
        <Row wrap>
          <Pill tone="muted" label={doc.geDocId ? `GE data store: ${doc.geDocId}` : 'Site document'} />
          {sop && sop.history.length > 1 ? <Pill tone="accent" label={`Updated ${clock(last!.at)} by HQ`} /> : null}
        </Row>
        {doc.sections.map((sec) => {
          const hit = sec.id === section;
          const changed = sop && last && sop.history.length > 1 && last.note.startsWith(`step ${sec.id.slice(1)} `);
          return (
            <View key={sec.id}
              onLayout={(e) => {
                offsets.current[sec.id] = e.nativeEvent.layout.y;
                if (hit) setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 20), animated: true }), 50);
              }}
              style={{ padding: space.md, borderRadius: 12, backgroundColor: hit ? c.attentionBg : c.surface, borderWidth: hit ? 2 : 1, borderColor: hit ? c.attention : c.border, gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="bodyStrong">{sec.heading}</Txt>
                {changed ? <Pill tone="accent" label={`New in v${sop!.version}`} /> : hit ? <Pill tone="attention" label="Cited" /> : null}
              </Row>
              <Txt selectable>{sec.body}</Txt>
            </View>
          );
        })}
        {sop ? (
          <View style={{ gap: 4 }}>
            <Txt v="label">Version history</Txt>
            {sop.history.slice().reverse().map((h) => <Txt key={h.version + h.at} v="caption">v{h.version} · {new Date(h.at).toLocaleDateString()} · {h.note}</Txt>)}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
