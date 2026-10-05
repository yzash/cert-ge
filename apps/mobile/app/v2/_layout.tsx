import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Redirect, Slot, useGlobalSearchParams, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useApp } from '@/store/app';
import { useChat } from '@/v2/chatStore';
import { PanelHost } from '@/v2/panels';
import { Drawer, ProfileMenu, Sidebar, useWide, V2Toasts } from '@/v2/shell';
import { useV2 } from '@/v2/ui';

/** /v2: chat-first, Gemini-style shell. The classic app stays at /. */
export default function V2Layout() {
  const c = useV2();
  const path = usePathname();
  const wide = useWide();
  const { as } = useGlobalSearchParams<{ as?: string }>();
  const session = useApp((s) => s.session);
  const view = useApp((s) => s.view);
  const signIn = useApp((s) => s.signIn);
  const loadChat = useChat((s) => s.load);
  const chatLoaded = useChat((s) => s.loaded);
  const [fonts] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [asDone, setAsDone] = useState(!as);

  useEffect(() => { void loadChat(); }, []);
  useEffect(() => {
    if (as && view?.officers.some((o) => o.id === as)) void signIn(as, true).then(() => setAsDone(true));
    else setAsDone(true);
  }, [as]);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = c.bg;
      document.title = 'Mozart · Certis Frontline';
    }
  }, [c.bg]);

  if (!fonts || !chatLoaded || !asDone) {
    return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.orange} /></View>;
  }
  const signInPage = path === '/v2/sign-in';
  if (!session && !signInPage) return <Redirect href="/v2/sign-in" />;
  if (signInPage) return <View style={{ flex: 1, backgroundColor: c.bg }}><Slot /></View>;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
      {wide ? <Sidebar /> : null}
      <View style={{ flex: 1, backgroundColor: c.bg }}><Slot /></View>
      <PanelHost />
      {!wide ? <Drawer /> : null}
      <ProfileMenu />
      <V2Toasts />
    </View>
  );
}
