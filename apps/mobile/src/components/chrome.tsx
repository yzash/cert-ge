import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { space, radius } from '@mozart/ui';
import { useApp } from '@/store/app';
import { useMe, useOnline, usePendingCount, useView } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { clock } from '@/lib/format';
import { Button, Icon, Pill, Row, Txt } from './ui';

/** "Offline · 3 pending" strip. Visible whenever we are offline or have queued writes. */
export function ConnectivityBar() {
  const c = useTheme();
  const online = useOnline();
  const pending = usePendingCount();
  const syncing = useApp((s) => s.syncing);
  const airplane = useApp((s) => s.settings.airplane);
  const setSettings = useApp((s) => s.setSettings);
  if (online && !pending) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => (airplane ? setSettings({ airplane: false }) : router.push('/me'))}
      style={{ backgroundColor: online ? c.infoBg : c.attentionBg, paddingVertical: 6, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      <Icon name={online ? 'cloud-upload-outline' : airplane ? 'airplane' : 'cloud-offline-outline'} size={16} color={online ? c.info : c.attention} />
      <Txt v="caption" color={online ? c.info : c.attention} style={{ flex: 1, fontWeight: '700' }}>
        {online ? (syncing ? `Syncing ${pending}…` : `${pending} waiting to sync`) : `Offline${airplane ? ' (airplane mode)' : ''} · ${pending} pending sync`}
      </Txt>
      {airplane ? <Txt v="caption" color={c.attention}>Tap to reconnect</Txt> : null}
    </Pressable>
  );
}

export function Toasts() {
  const c = useTheme();
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 54, left: 10, right: 10, gap: 8, zIndex: 50 }}>
      {toasts.map((t) => {
        const color = t.kind === 'error' ? c.fail : t.kind === 'success' ? c.pass : t.kind === 'push' ? c.primary : c.info;
        return (
          <Pressable key={t.id} onPress={() => { dismiss(t.id); if (t.link) router.push(t.link as never); }}
            style={{ backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: color, padding: space.md, flexDirection: 'row', gap: 10, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 }}>
            <Icon name={t.kind === 'error' ? 'alert-circle' : t.kind === 'push' ? 'notifications' : 'checkmark-circle'} color={color} />
            <View style={{ flex: 1 }}>
              <Txt v="bodyStrong">{t.title}</Txt>
              {t.body ? <Txt v="small" numberOfLines={3}>{t.body}</Txt> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** F8: full-screen emergency takeover until acknowledged. */
export function AlertTakeover() {
  const session = useApp((s) => s.session);
  const view = useApp((s) => s.view);
  const dispatch = useApp((s) => s.dispatch);
  const me = session && view?.officers.find((o) => o.id === session.officerId);
  const alert = me && me.role === 'officer' ? view!.alerts.find((a) => a.active && a.siteId === me.siteId && !a.acks[me.id]) : undefined;
  const sop = alert?.sopId ? view!.sops.find((s) => s.id === alert.sopId) : undefined;
  const [showSop, setShowSop] = React.useState(false);

  useEffect(() => {
    if (!alert) return;
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const t = setInterval(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), 1500);
      return () => clearInterval(t);
    }
  }, [alert?.id]);

  if (!alert) return null;
  const bg = alert.kind === 'evacuation' ? '#B3261E' : alert.kind === 'lockdown' ? '#6A1B9A' : alert.kind === 'bolo' ? '#0B2A4A' : '#B3261E';
  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bg, zIndex: 100, padding: space.xl, paddingTop: 70 }}>
      <ScrollView contentContainerStyle={{ gap: space.lg, paddingBottom: 40 }}>
        <Row>
          <Icon name="warning" size={34} color="#fff" />
          <Txt v="label" color="#FFD6D2">{alert.kind === 'drill' ? 'DRILL · ' : ''}Emergency alert · {clock(alert.sentAt)}</Txt>
        </Row>
        <Txt v="h1" color="#fff">{alert.title}</Txt>
        <Txt v="body" color="#fff" style={{ fontSize: 18, lineHeight: 26 }}>{alert.body}</Txt>
        {sop ? (
          showSop ? (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: space.lg, gap: 10 }}>
              <Txt v="bodyStrong" color="#fff">{sop.code} {sop.title}</Txt>
              {sop.steps.map((s) => (
                <Row key={s.n} style={{ alignItems: 'flex-start' }}>
                  <Txt v="bodyStrong" color="#FFD6D2">{s.n}.</Txt>
                  <Txt color="#fff" style={{ flex: 1 }}>{s.text}</Txt>
                </Row>
              ))}
            </View>
          ) : (
            <Button kind="secondary" icon="document-text-outline" label={`Open SOP card: ${sop.code}`} onPress={() => setShowSop(true)} />
          )
        ) : null}
        <Button size="lg" kind="success" icon="checkmark-circle" label="Acknowledge" onPress={() => dispatch({ type: 'alert.ack', alertId: alert.id })} />
      </ScrollView>
    </View>
  );
}

/** Big push-to-talk entry point on Shift Home. */
export function MicFab({ onPress, label }: { onPress: () => void; label: string }) {
  const c = useTheme();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', bottom: 18, left: 0, right: 0, alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report by voice"
        onPress={onPress}
        style={({ pressed }) => ({
          width: 76, height: 76, borderRadius: 38, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
          shadowColor: c.primary, shadowOpacity: 0.6, shadowRadius: 18, elevation: 10, transform: [{ scale: pressed ? 0.94 : 1 }],
          borderWidth: 4, borderColor: c.bg,
        })}
      >
        <Icon name="mic" size={36} color={c.primaryText} />
      </Pressable>
      <View style={{ marginTop: 4, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, backgroundColor: c.bg }}>
        <Txt v="caption" style={{ fontWeight: '700' }}>{label}</Txt>
      </View>
    </View>
  );
}

const RUN_OF_SHOW = [
  { n: 1, who: 'o-faizal', text: 'Faizal signs in, airplane mode on. Acknowledges the policy update.', to: '/home' },
  { n: 2, who: 'o-faizal', text: 'Asks by voice: supervisory fault on L3. Opens the cited SOP.', to: '/ask' },
  { n: 3, who: 'o-faizal', text: 'Verify the L3 panel: Attention. Attach to CWO-240417.', to: '/wo/CWO-240417' },
  { n: 4, who: 'o-faizal', text: 'Hold mic: jammed gate report. Fix severity, add photo, submit.', to: '/report' },
  { n: 5, who: 'o-faizal', text: 'Friction log: “gate SOP step 4 assumes a key we don’t carry”.', to: '/friction' },
  { n: 6, who: 'o-meiling', text: 'Handover + sign. Mei Ling approves closure, forwards friction.', to: '/handover' },
  { n: 7, who: 'o-raj', text: 'Raj (web): theme has 6 logs / 3 sites. Change SOP, publish.', to: '/hq' },
  { n: 8, who: 'o-faizal', text: 'Faizal: new briefing item, updated SOP step. Acknowledge.', to: '/home' },
  { n: 9, who: 'o-faizal', text: 'Optional: flip LIVE in Me and repeat step 2.', to: '/me' },
];

/** Web-only presenter rail beside the phone frame: personas, airplane mode, run-of-show. */
export function PresenterRail() {
  const c = useTheme();
  const view = useView();
  const session = useApp((s) => s.session);
  const signIn = useApp((s) => s.signIn);
  const setSettings = useApp((s) => s.setSettings);
  const airplane = useApp((s) => s.settings.airplane);
  const reset = useApp((s) => s.reset);
  const pending = usePendingCount();
  const personas = useMemo(() => view?.officers.filter((o) => o.persona) ?? [], [view]);

  const go = async (who: string, to: string) => {
    if (who === 'o-raj') {
      if (typeof window !== 'undefined') window.open('/hq', 'mozart-hq');
      return;
    }
    if (session?.officerId !== who) await signIn(who, true);
    router.replace(to as never);
  };

  return (
    <ScrollView style={{ width: 300, maxHeight: '100%' }} contentContainerStyle={{ gap: space.md, padding: space.lg }}>
      <View>
        <Txt v="label" color={c.primary}>Mozart Frontline</Txt>
        <Txt v="title">Presenter controls</Txt>
        <Txt v="caption">Each browser tab is a separate device. Open HQ in its own tab.</Txt>
      </View>
      <View style={{ gap: 6 }}>
        <Txt v="label">This device is</Txt>
        {personas.filter((p) => p.role !== 'hq').map((p) => (
          <Pressable key={p.id} onPress={() => void go(p.id, p.role === 'supervisor' ? '/team' : '/home')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, backgroundColor: session?.officerId === p.id ? c.surfaceAlt : 'transparent', borderWidth: 1, borderColor: session?.officerId === p.id ? c.primary : c.border }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="caption" color={c.accentText} style={{ fontWeight: '800' }}>{p.initials}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="small" color={c.text} style={{ fontWeight: '700' }}>{p.name}</Txt>
              <Txt v="caption">{p.title}</Txt>
            </View>
          </Pressable>
        ))}
        <Button size="sm" icon="sparkles-outline" label="Try v2: chat-first (new tab)" onPress={() => window.open('/v2', 'mozart-v2')} />
        <Button size="sm" kind="secondary" icon="open-outline" label="Open Raj's HQ view (new tab)" onPress={() => window.open('/hq', 'mozart-hq')} />
        <Button size="sm" kind="secondary" icon="copy-outline" label="Open Mei Ling (new tab)" onPress={() => window.open('/?as=o-meiling', 'mozart-meiling')} />
      </View>
      <Pressable onPress={() => setSettings({ airplane: !airplane })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: airplane ? c.attentionBg : c.surfaceAlt, borderWidth: 1, borderColor: airplane ? c.attention : c.border }}>
        <Icon name="airplane" color={airplane ? c.attention : c.textMuted} />
        <View style={{ flex: 1 }}>
          <Txt v="small" color={c.text} style={{ fontWeight: '700' }}>Airplane mode {airplane ? 'ON' : 'off'}</Txt>
          <Txt v="caption">{pending} queued on this device</Txt>
        </View>
      </Pressable>
      <View style={{ gap: 6 }}>
        <Txt v="label">Run-of-show (12 min)</Txt>
        {RUN_OF_SHOW.map((r) => (
          <Pressable key={r.n} onPress={() => void go(r.who, r.to)} style={{ flexDirection: 'row', gap: 8, padding: 6, borderRadius: 8 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="caption" color={c.text} style={{ fontWeight: '800' }}>{r.n}</Txt>
            </View>
            <Txt v="caption" color={c.text} style={{ flex: 1 }}>{r.text}</Txt>
          </Pressable>
        ))}
      </View>
      <Button size="sm" kind="ghost" icon="refresh" label="Reset demo data (all tabs)" onPress={() => void reset()} />
      <Pill tone="muted" label="Synthetic data · no live Mozart backend" />
    </ScrollView>
  );
}
