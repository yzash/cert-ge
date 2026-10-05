import { fixtureImages, robotSnapshots } from '@mozart/fixtures';
import type { Attachment } from '@mozart/schema';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { takePhoto } from '@/components/attach';
import { SceneImage } from '@/components/media';
import { Btn, Row, T, useV2 } from './ui';

/** Take a real photo, or pick a demo photo (scenes, robot snapshots, a receipt). */
export function PhotoButton({ onPick, assetId, label = 'Add photo', receipts }: { onPick: (a: Attachment) => void; assetId?: string | null; label?: string; receipts?: boolean }) {
  const c = useV2();
  const [open, setOpen] = useState(false);
  const scenes = receipts
    ? [{ id: 'snap-receipt', label: 'Taxi receipt' }]
    : [
      ...Object.keys(robotSnapshots).filter((k) => k !== 'snap-receipt').map((id) => ({ id, label: id.replace('snap-', 'Snapshot: '), assetId: '' })),
      ...fixtureImages.map((f) => ({ id: f.id, label: f.label, assetId: f.assetId })),
    ].sort((a, b) => Number((b as { assetId?: string }).assetId === assetId) - Number((a as { assetId?: string }).assetId === assetId));
  const pick = (id: string, caption: string) => {
    onPick({ id: `att-${Date.now().toString(36)}`, kind: 'fixtureImage', uri: `fixture://${id}`, caption, at: new Date().toISOString() });
    setOpen(false);
  };
  return (
    <View style={{ gap: 8 }}>
      <Row wrap>
        <Btn size="sm" kind="soft" icon="camera-outline" label={label} onPress={async () => { const a = await takePhoto(); if (a) onPick(a); }} />
        <Btn size="sm" kind="ghost" icon="images-outline" label={receipts ? 'Demo receipt' : 'Demo photo'} onPress={() => setOpen((o) => !o)} />
      </Row>
      {open ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {scenes.map((f) => (
            <Pressable key={f.id} onPress={() => pick(f.id, f.label)} style={{ width: 104, gap: 4 }} accessibilityLabel={f.label}>
              <SceneImage uri={`fixture://${f.id}`} height={84} style={{ borderWidth: 1, borderColor: c.border }} />
              <T v="caption" numberOfLines={2}>{f.label}</T>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
