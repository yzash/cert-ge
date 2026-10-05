/** v2 shell: Gemini-style sidebar (desktop) / drawer (phone), profile menu, toasts. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { approvalsFor, fleetSummary } from '@mozart/actions';
import { v2 } from '@mozart/ui';
import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useMe, useOnline, usePendingCount, useView } from '@/lib/hooks';
import { useApp } from '@/store/app';
import { useChat } from './chatStore';
import { Avatar, Btn, Divider, Icon, IconBtn, Row, T, useV2, type IconName } from './ui';

export const useShell = create<{ drawer: boolean; menu: boolean; setDrawer(v: boolean): void; setMenu(v: boolean): void }>((set) => ({
  drawer: false, menu: false, setDrawer: (drawer) => set({ drawer }), setMenu: (menu) => set({ menu }),
}));

export function useWide() {
  return useWindowDimensions().width >= 900;
}

interface NavItem { to: string; label: string; icon: IconName; roles: string[]; badge?: number }

function Nav() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const path = usePathname();
  const setDrawer = useShell((x) => x.setDrawer);
  const approvals = me.role !== 'officer' ? approvalsFor(s, me.role === 'hq' ? 'o-meiling' : me.id) : null;
  const pendingApprovals = approvals ? approvals.closures.length + approvals.leave.length + approvals.claims.length + approvals.swaps.length : 0;
  const robots = fleetSummary(s, 'CNP');
  const items: NavItem[] = [
    { to: '/v2/chat', label: 'Chat', icon: 'chatbubble-ellipses-outline', roles: ['officer', 'supervisor', 'hq'] },
    { to: '/v2/tasks', label: 'My tasks', icon: 'checkbox-outline', roles: ['officer'] },
    { to: '/v2/tour', label: 'Guard tour', icon: 'walk-outline', roles: ['officer'] },
    { to: '/v2/requests', label: 'HR & pay', icon: 'wallet-outline', roles: ['officer', 'supervisor'] },
    { to: '/v2/team', label: 'Team', icon: 'people-outline', roles: ['supervisor'], badge: pendingApprovals },
    { to: '/v2/control', label: 'Control tower', icon: 'map-outline', roles: ['supervisor', 'hq'], badge: robots.openEvents },
    { to: '/v2/insights', label: 'Insights', icon: 'analytics-outline', roles: ['hq', 'supervisor'] },
  ];
  return (
    <View style={{ gap: 2 }}>
      {items.filter((i) => i.roles.includes(me.role)).map((i) => {
        const active = path === i.to;
        return (
          <Pressable key={i.to} onPress={() => { router.push(i.to as never); setDrawer(false); }} accessibilityRole="link"
            style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, height: 42, paddingHorizontal: 12, borderRadius: 999, backgroundColor: active ? c.navySoft : hovered ? c.sunken : 'transparent' })}>
            <Ionicons name={i.icon} size={19} color={active ? c.navy : c.textMuted} />
            <Text style={{ flex: 1, color: active ? c.navy : c.text, fontFamily: active ? v2.font.semibold : v2.font.medium, fontSize: 14 }}>{i.label}</Text>
            {i.badge ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ color: c.onOrange, fontSize: 11, fontFamily: v2.font.bold }}>{i.badge}</Text></View> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Recent() {
  const c = useV2();
  const me = useMe();
  const all = useChat((x) => x.threads);
  const threads = all.filter((t) => t.officerId === me.id && t.messages.length);
  const currentId = useChat((x) => x.currentId);
  const select = useChat((x) => x.select);
  const setDrawer = useShell((x) => x.setDrawer);
  if (!threads.length) return null;
  return (
    <View style={{ gap: 2 }}>
      <T v="label" style={{ paddingHorizontal: 12, marginBottom: 4 }}>Recent</T>
      {threads.slice(0, 12).map((t) => (
        <Pressable key={t.id} onPress={() => { select(t.id); router.push('/v2/chat'); setDrawer(false); }}
          style={({ hovered }: { hovered?: boolean }) => ({ height: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, backgroundColor: t.id === currentId ? c.sunken : hovered ? c.sunken : 'transparent' })}>
          <T v="small" color={c.text} numberOfLines={1}>{t.title}</T>
        </Pressable>
      ))}
    </View>
  );
}

export function Sidebar() {
  const c = useV2();
  const me = useMe();
  const online = useOnline();
  const pending = usePendingCount();
  const newThread = useChat((x) => x.newThread);
  const setMenu = useShell((x) => x.setMenu);
  const setDrawer = useShell((x) => x.setDrawer);
  const insets = useSafeAreaInsets();
  return (
    <View style={{ width: 280, height: '100%', backgroundColor: c.mode === 'dark' ? c.surface : '#EEF2F7', paddingTop: insets.top + 14, paddingHorizontal: 12, paddingBottom: 12, gap: 14 }}>
      <Row style={{ paddingHorizontal: 8, justifyContent: 'space-between' }}>
        <Row gap={10}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: c.navy, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.onNavy, fontFamily: v2.font.bold, fontSize: 15 }}>M</Text>
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: c.orange, borderWidth: 2, borderColor: c.mode === 'dark' ? c.surface : '#EEF2F7' }} />
          </View>
          <View>
            <Text style={{ color: c.text, fontFamily: v2.font.semibold, fontSize: 16 }}>Mozart</Text>
            <T v="caption">Certis Frontline</T>
          </View>
        </Row>
      </Row>
      <Btn kind="soft" icon="add" label="New chat" style={{ justifyContent: 'flex-start' }} onPress={() => { newThread(me.id); router.push('/v2/chat'); setDrawer(false); }} />
      <Nav />
      <Divider style={{ marginHorizontal: 8 }} />
      <ScrollView style={{ flex: 1 }}><Recent /></ScrollView>
      <Row gap={6} style={{ paddingHorizontal: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? c.pass : c.warn }} />
        <T v="caption">{online ? 'Online' : 'Offline'}{pending ? ` · ${pending} to sync` : ''}</T>
      </Row>
      <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel="Profile and settings"
        style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, backgroundColor: hovered ? c.sunken : 'transparent' })}>
        <Avatar initials={me.initials} size={34} />
        <View style={{ flex: 1 }}>
          <T v="smallStrong" numberOfLines={1}>{me.name}</T>
          <T v="caption" numberOfLines={1}>{me.title}</T>
        </View>
        <Icon name="ellipsis-horizontal" />
      </Pressable>
    </View>
  );
}

/** Profile menu: switch persona (demo), appearance, connectivity, AI mode, classic app. */
export function ProfileMenu() {
  const c = useV2();
  const s = useView();
  const me = useMe();
  const open = useShell((x) => x.menu);
  const setMenu = useShell((x) => x.setMenu);
  const settings = useApp((x) => x.settings);
  const setSettings = useApp((x) => x.setSettings);
  const signIn = useApp((x) => x.signIn);
  const signOut = useApp((x) => x.signOut);
  const reset = useApp((x) => x.reset);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!open) return null;
  const personas = s.officers.filter((o) => o.persona);
  const Toggle = ({ label, value, onChange, icon }: { label: string; value: boolean; onChange: (v: boolean) => void; icon: IconName }) => (
    <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
      <Row gap={10}><Icon name={icon} /><T v="small" color={c.text}>{label}</T></Row>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.orange, false: c.borderStrong }} accessibilityLabel={label} />
    </Row>
  );
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60 }}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={() => setMenu(false)} accessibilityLabel="Close menu" />
      <View style={{ position: 'absolute', left: 12, bottom: 12, width: 320, maxWidth: '92%', backgroundColor: c.raised, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: c.border, ...(Platform.OS === 'web' ? { boxShadow: `0 12px 40px ${c.shadow}` } : {}) } as never}>
        <T v="label">Switch user (demo)</T>
        {personas.map((p) => (
          <Pressable key={p.id} onPress={async () => { await signIn(p.id, true); setMenu(false); router.replace('/v2/chat'); }}
            style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 6, borderRadius: 12, backgroundColor: p.id === me.id ? c.navySoft : hovered ? c.sunken : 'transparent' })}>
            <Avatar initials={p.initials} size={28} tone={p.id === me.id ? 'orange' : 'navy'} />
            <View style={{ flex: 1 }}><T v="smallStrong">{p.name}</T><T v="caption">{p.title}</T></View>
          </Pressable>
        ))}
        <Row wrap gap={6}>
          <Btn size="sm" kind="ghost" icon="open-outline" label="Mei Ling in new tab" onPress={() => Platform.OS === 'web' && window.open('/v2?as=o-meiling', 'v2-meiling')} />
          <Btn size="sm" kind="ghost" icon="open-outline" label="Raj in new tab" onPress={() => Platform.OS === 'web' && window.open('/v2?as=o-raj', 'v2-raj')} />
        </Row>
        <Divider />
        <Toggle label="Dark mode (night shift)" icon="moon-outline" value={settings.v2Theme === 'dark'} onChange={(v) => setSettings({ v2Theme: v ? 'dark' : 'light' })} />
        <Toggle label="Airplane mode (0 bars)" icon="airplane-outline" value={settings.airplane} onChange={(v) => setSettings({ airplane: v })} />
        <Toggle label="LIVE AI (Gemini Enterprise)" icon="sparkles-outline" value={settings.aiMode === 'LIVE'} onChange={(v) => setSettings({ aiMode: v ? 'LIVE' : 'DEMO' })} />
        <Divider />
        <Row wrap gap={6}>
          <Btn size="sm" kind="ghost" icon="phone-portrait-outline" label="Classic app (v1)" onPress={() => { setMenu(false); router.replace('/'); }} />
          {confirmReset
            ? <Btn size="sm" kind="danger" label="Confirm reset" onPress={() => { void reset(); useChat.setState({ threads: [], currentId: null, surfaced: [] }); setConfirmReset(false); setMenu(false); }} />
            : <Btn size="sm" kind="ghost" icon="refresh" label="Reset demo" onPress={() => setConfirmReset(true)} />}
          <Btn size="sm" kind="ghost" icon="log-out-outline" label="Sign out" onPress={() => { signOut(); setMenu(false); router.replace('/v2/sign-in'); }} />
        </Row>
      </View>
    </View>
  );
}

export function Drawer() {
  const c = useV2();
  const open = useShell((x) => x.drawer);
  const setDrawer = useShell((x) => x.setDrawer);
  if (!open) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, flexDirection: 'row' }}>
      <Sidebar />
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={() => setDrawer(false)} accessibilityLabel="Close navigation" />
    </View>
  );
}

/** Top bar for pages (chat has its own). */
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const setDrawer = useShell((x) => x.setDrawer);
  return (
    <Row style={{ paddingTop: insets.top + 10, paddingHorizontal: wide ? 32 : 12, paddingBottom: 10, justifyContent: 'space-between' }}>
      <Row gap={6} style={{ flex: 1 }}>
        {!wide ? <IconBtn icon="menu" label="Open navigation" onPress={() => setDrawer(true)} /> : null}
        <View style={{ flex: 1 }}>
          <T v="title" numberOfLines={1}>{title}</T>
          {subtitle ? <T v="caption" numberOfLines={1}>{subtitle}</T> : null}
        </View>
      </Row>
      {right}
    </Row>
  );
}

export function V2Toasts() {
  const c = useV2();
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 16, right: 16, left: 16, alignItems: 'center', gap: 8, zIndex: 70 }}>
      {toasts.map((t) => (
        <Pressable key={t.id} onPress={() => dismiss(t.id)}
          style={{ maxWidth: 440, width: '100%', flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: c.raised, borderWidth: 1, borderColor: c.border, ...(Platform.OS === 'web' ? { boxShadow: `0 8px 30px ${c.shadow}` } : {}) } as never}>
          <Icon name={t.kind === 'error' ? 'alert-circle' : t.kind === 'push' ? 'notifications' : 'checkmark-circle'} color={t.kind === 'error' ? c.fail : t.kind === 'push' ? c.orange : c.pass} />
          <View style={{ flex: 1 }}>
            <T v="smallStrong">{t.title}</T>
            {t.body ? <T v="caption" numberOfLines={3}>{t.body}</T> : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}
