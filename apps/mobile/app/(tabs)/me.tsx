import type { Lang } from '@mozart/schema';
import { space } from '@mozart/ui';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Switch, View } from 'react-native';
import { Button, Card, Chip, Field, KeyValue, Pill, Row, Screen, Section, Txt } from '@/components/ui';
import { ago, clock } from '@/lib/format';
import { useMe, useOnline, usePendingCount, useView } from '@/lib/hooks';
import { LANG_LABEL } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useApp } from '@/store/app';

/** Screen 12: profile, language, offline queue, GE seat, DEMO/LIVE, audit trail. */
export default function Me() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const online = useOnline();
  const pendingCount = usePendingCount();
  const settings = useApp((x) => x.settings);
  const setSettings = useApp((x) => x.setSettings);
  const outbox = useApp((x) => x.outbox);
  const flush = useApp((x) => x.flush);
  const lastSyncAt = useApp((x) => x.lastSyncAt);
  const signOut = useApp((x) => x.signOut);
  const reset = useApp((x) => x.reset);
  const serverKind = settings.backend;
  const [bff, setBff] = useState(settings.bffUrl);
  const [confirmReset, setConfirmReset] = useState(false);
  const audit = s.audit.filter((a) => a.officerId === me.id).slice(0, 12);
  const notifs = s.notifications.filter((n) => n.officerId === me.id && !n.read).length;

  return (
    <Screen title="Me" subtitle={`${me.name} · ${me.title}`}>
      <Card>
        <View style={{ gap: 8 }}>
          <KeyValue k="Site" v={s.sites.find((x) => x.id === me.siteId)?.name ?? 'HQ'} />
          <KeyValue k="Shift" v={me.shiftId === 'night' ? 'Night 19:00–07:00' : me.shiftId === 'day' ? 'Day 07:00–19:00' : 'Office'} />
          <KeyValue k="Role" v={me.role} />
          <KeyValue k="Gemini Enterprise seat" v={me.geSeatStatus === 'assigned' ? 'Frontline · assigned' : me.geSeatStatus === 'standard' ? 'Standard/Plus' : me.geSeatStatus} />
          <KeyValue k="Identity" v="Stub IdP → WIF token (per officer)" />
        </View>
      </Card>

      <Button kind="secondary" icon="notifications-outline" label={`Notifications${notifs ? ` (${notifs} new)` : ''}`} onPress={() => router.push('/notifications')} />

      <Section title="Language">
        <Row wrap>{(Object.keys(LANG_LABEL) as Lang[]).map((l) => <Chip key={l} label={LANG_LABEL[l]} selected={settings.lang === l} onPress={() => setSettings({ lang: l })} />)}</Row>
      </Section>

      <Section title="Connectivity & offline queue">
        <Card>
          <View style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Txt v="bodyStrong">Airplane mode (simulate 0 bars)</Txt>
                <Txt v="caption">Writes queue on this device and replay in order on reconnect.</Txt>
              </View>
              <Switch value={settings.airplane} onValueChange={(v) => setSettings({ airplane: v })} trackColor={{ true: c.attention, false: c.border }} accessibilityLabel="Airplane mode" />
            </Row>
            <Row wrap>
              <Pill tone={online ? 'pass' : 'attention'} label={online ? 'Online' : 'Offline'} />
              <Pill tone={pendingCount ? 'attention' : 'muted'} label={`${pendingCount} pending`} />
              <Txt v="caption">{lastSyncAt ? `Last sync ${ago(lastSyncAt)}` : 'Not synced yet'}</Txt>
            </Row>
            {outbox.filter((o) => o.type !== 'audit.ai').slice(0, 6).map((o) => (
              <Txt key={o.key} v="caption">• {o.type} · {clock(o.at)} · key {o.key.slice(-6)}</Txt>
            ))}
            {pendingCount && online ? <Button size="sm" icon="cloud-upload-outline" label="Sync now" onPress={() => void flush()} /> : null}
          </View>
        </Card>
      </Section>

      <Section title="AI mode">
        <Card>
          <View style={{ gap: 10 }}>
            <Row wrap>
              <Chip label="DEMO (scripted, offline)" selected={settings.aiMode === 'DEMO'} onPress={() => setSettings({ aiMode: 'DEMO' })} />
              <Chip label="LIVE (Gemini Enterprise)" selected={settings.aiMode === 'LIVE'} onPress={() => setSettings({ aiMode: 'LIVE' })} />
            </Row>
            <Txt v="caption">
              LIVE sends Ask, Voice report and Verify through the BFF to Gemini Enterprise streamAssist and GEAP agents with your own token. Any LIVE failure falls back to a DEMO answer with a visible badge.
            </Txt>
            <Field label="BFF URL" value={bff} onChangeText={setBff} autoCapitalize="none" placeholder="https://mozart-frontline-bff.run.app" onEndEditing={() => setSettings({ bffUrl: bff.trim() })} onBlur={() => setSettings({ bffUrl: bff.trim() })} />
            <Row wrap>
              <Chip label="Sync: this device" selected={serverKind === 'local'} onPress={() => setSettings({ backend: 'local' })} />
              <Chip label="Sync: BFF (multi-device)" selected={serverKind === 'bff'} onPress={() => (bff.trim() ? setSettings({ backend: 'bff', bffUrl: bff.trim() }) : useApp.getState().toast({ kind: 'error', title: 'Set a BFF URL first' }))} />
            </Row>
            {settings.aiMode === 'LIVE' && !settings.bffUrl ? <Txt v="caption" color={c.attention}>No BFF URL: LIVE calls will fall back to DEMO.</Txt> : null}
          </View>
        </Card>
      </Section>

      <Section title="Appearance">
        <Row wrap>
          <Chip icon="moon-outline" label="Dark (night shift)" selected={settings.theme === 'dark'} onPress={() => setSettings({ theme: 'dark' })} />
          <Chip icon="sunny-outline" label="Light" selected={settings.theme === 'light'} onPress={() => setSettings({ theme: 'light' })} />
        </Row>
      </Section>

      <Section title="My AI audit trail">
        <Card>
          <View style={{ gap: 6 }}>
            {audit.length === 0 ? <Txt v="caption">No AI calls yet.</Txt> : null}
            {audit.map((a) => (
              <Txt key={a.id} v="caption">
                {clock(a.at)} · {a.kind} · {a.feature}{a.model ? ` · ${a.model}` : ''}{a.latencyMs !== undefined ? ` · ${a.latencyMs} ms` : ''}{a.promptHash ? ` · #${a.promptHash}` : ''}{a.recordId ? ` · ${a.recordId}` : ''}
              </Txt>
            ))}
          </View>
        </Card>
      </Section>

      <Row wrap>
        <Button kind="secondary" icon="log-out-outline" label="Sign out" onPress={() => { signOut(); router.replace('/sign-in'); }} />
        {confirmReset ? (
          <Button kind="danger" icon="refresh" label="Confirm reset" onPress={() => { void reset(); setConfirmReset(false); }} />
        ) : (
          <Button kind="ghost" icon="refresh" label="Reset demo data" onPress={() => setConfirmReset(true)} />
        )}
      </Row>
      <Txt v="caption">Mozart Frontline MVP · synthetic data · {s.workOrders.length} work orders · {s.assets.length} assets · {s.sops.length} SOPs</Txt>
    </Screen>
  );
}
