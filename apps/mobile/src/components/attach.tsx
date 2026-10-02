import { fixtureImages } from '@mozart/fixtures';
import type { Attachment } from '@mozart/schema';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '@/lib/theme';
import { SceneImage } from './media';
import { Button, Row, Txt } from './ui';

/** Take a real photo (kept small for offline storage) or pick a demo scene photo. */
export async function takePhoto(): Promise<Attachment | null> {
  try {
    const perm = Platform.OS === 'web' ? { granted: true } : await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const res = Platform.OS === 'web'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.25, base64: true })
      : await ImagePicker.launchCameraAsync({ quality: 0.25, base64: true });
    if (res.canceled || !res.assets[0]) return null;
    const a = res.assets[0];
    const uri = a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri;
    return { id: `att-${Date.now().toString(36)}`, kind: 'photo', uri, at: new Date().toISOString() };
  } catch {
    return null;
  }
}

export function PhotoPicker({ onPick, assetId, label = 'Add photo' }: { onPick: (a: Attachment) => void; assetId?: string | null; label?: string }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const scenes = [...fixtureImages].sort((a, b) => (a.assetId === assetId ? -1 : 0) - (b.assetId === assetId ? -1 : 0));
  return (
    <View style={{ gap: 8 }}>
      <Row wrap>
        <Button size="sm" kind="secondary" icon="camera-outline" label={label} onPress={async () => { const a = await takePhoto(); if (a) onPick(a); }} />
        <Button size="sm" kind="ghost" icon="images-outline" label="Demo photo" onPress={() => setOpen((o) => !o)} />
      </Row>
      {open ? (
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
          {scenes.map((f) => (
            <Pressable key={f.id} onPress={() => { onPick({ id: `att-${Date.now().toString(36)}`, kind: 'fixtureImage', uri: `fixture://${f.id}`, caption: f.label, at: new Date().toISOString() }); setOpen(false); }}
              style={{ width: 96, gap: 4 }}>
              <SceneImage uri={`fixture://${f.id}`} height={120} style={{ borderWidth: 1, borderColor: f.assetId === assetId ? c.primary : c.border }} />
              <Txt v="caption" numberOfLines={2}>{f.label}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

export function AttachmentStrip({ items }: { items: Attachment[] }) {
  if (!items.length) return null;
  return (
    <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
      {items.map((a) => (
        <View key={a.id} style={{ width: 90, gap: 2 }}>
          <SceneImage uri={a.uri} height={110} />
          {a.caption ? <Txt v="caption" numberOfLines={2}>{a.caption}</Txt> : null}
        </View>
      ))}
    </ScrollView>
  );
}
