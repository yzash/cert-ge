import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { ConnectivityBar } from '@/components/chrome';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useApp } from '@/store/app';

export default function TabsLayout() {
  const c = useTheme();
  const t = useT();
  const session = useApp((s) => s.session);
  const role = useApp((s) => s.view?.officers.find((o) => o.id === s.session?.officerId)?.role);
  const unread = useApp((s) => s.view?.notifications.filter((n) => n.officerId === s.session?.officerId && !n.read).length ?? 0);
  if (!session) return <Redirect href="/sign-in" />;
  if (role === 'hq') return <Redirect href="/hq" />;
  const sup = role === 'supervisor';
  const icon = (name: React.ComponentProps<typeof Ionicons>['name']) => ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={(focused ? name : `${name}-outline`) as never} size={24} color={color} />
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ConnectivityBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.textMuted,
          tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.border, height: 66, paddingTop: 6, paddingBottom: 8 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
          sceneStyle: { backgroundColor: c.bg },
        }}
      >
        <Tabs.Screen name="team" options={{ title: t('team'), tabBarIcon: icon('people'), href: sup ? '/team' : null, tabBarBadge: undefined }} />
        <Tabs.Screen name="home" options={{ title: t('home'), tabBarIcon: icon('home') }} />
        <Tabs.Screen name="tasks" options={{ title: t('tasks'), tabBarIcon: icon('clipboard'), href: sup ? null : '/tasks' }} />
        <Tabs.Screen name="ask" options={{ title: t('ask'), tabBarIcon: icon('chatbubbles') }} />
        <Tabs.Screen name="tour" options={{ title: t('tour'), tabBarIcon: icon('walk'), href: sup ? null : '/tour' }} />
        <Tabs.Screen name="me" options={{ title: t('me'), tabBarIcon: icon('person-circle'), tabBarBadge: unread ? unread : undefined }} />
      </Tabs>
    </View>
  );
}
