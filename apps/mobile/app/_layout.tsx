import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertTakeover, PresenterRail, Toasts } from '@/components/chrome';
import { Txt } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { useApp } from '@/store/app';

export default function RootLayout() {
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);
  const c = useTheme();
  const path = usePathname();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = c.mode === 'dark' ? '#030912' : '#DDE3EC';
      document.title = path.startsWith('/hq') ? 'Mozart Frontline · HQ' : 'Mozart Frontline';
    }
  }, [c.mode, path]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator color={c.primary} />
        <Txt v="small">Loading Mozart Frontline…</Txt>
      </View>
    );
  }

  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: Platform.OS === 'web' ? 'none' : 'default' }}>
      <Stack.Screen name="report" options={{ presentation: 'modal' }} />
      <Stack.Screen name="verify" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );

  const framed = Platform.OS === 'web' && width >= 960 && !path.startsWith('/hq');
  if (!framed) {
    return (
      <SafeAreaProvider>
        <StatusBar style={c.mode === 'dark' ? 'light' : 'dark'} />
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          {stack}
          {!path.startsWith('/hq') ? <AlertTakeover /> : null}
          <Toasts />
        </View>
      </SafeAreaProvider>
    );
  }

  const phoneH = Math.min(860, height - 32);
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 16, backgroundColor: c.mode === 'dark' ? '#030912' : '#DDE3EC' }}>
        <View style={{ height: phoneH, justifyContent: 'center' }}>
          <PresenterRail />
        </View>
        <View style={{ width: 400, height: phoneH, borderRadius: 44, padding: 10, backgroundColor: '#111821', borderWidth: 1, borderColor: '#2B3747', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 40 }}>
          <View style={{ flex: 1, borderRadius: 34, overflow: 'hidden', backgroundColor: c.bg }}>
            {stack}
            <AlertTakeover />
            <Toasts />
          </View>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
