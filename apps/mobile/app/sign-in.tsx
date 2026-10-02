import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import type { Lang } from '@mozart/schema';
import { space, brand } from '@mozart/ui';
import { Button, Chip, Field, Icon, Row, Txt } from '@/components/ui';
import { LANG_LABEL } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useApp } from '@/store/app';

const emailFor = (name: string) => `${name.toLowerCase().replace(/\s+/g, '.')}@certisgroup.demo`;

/** Screen 1: email + password stub (Mobility V2 look), Remember me, language picker. */
export default function SignIn() {
  const c = useTheme();
  const view = useApp((s) => s.view)!;
  const signIn = useApp((s) => s.signIn);
  const setSettings = useApp((s) => s.setSettings);
  const lang = useApp((s) => s.settings.lang);
  const personas = view.officers.filter((o) => o.persona);
  const [email, setEmail] = useState(emailFor('Faizal Rahman'));
  const [password, setPassword] = useState('demo-password');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  const submit = async (officerId?: string) => {
    const o = officerId ? view.officers.find((x) => x.id === officerId) : view.officers.find((x) => emailFor(x.name) === email.trim().toLowerCase());
    if (!o) return setError('Unknown account. Use one of the demo personas below.');
    if (!officerId && !password) return setError('Enter your password.');
    await signIn(o.id, remember);
    router.replace(o.role === 'hq' ? '/hq' : o.role === 'supervisor' ? '/team' : '/home');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: 64, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 6, marginBottom: space.md }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: brand.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: brand.orange }}>
            <Txt v="h1" color="#fff" style={{ fontSize: 34 }}>M</Txt>
          </View>
          <Txt v="h2">Mozart Frontline</Txt>
          <Txt v="small">Certis · Officer app</Txt>
        </View>

        <Field label="Email" value={email} onChangeText={(t) => { setEmail(t); setError(''); }} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <Switch value={remember} onValueChange={setRemember} trackColor={{ true: c.primary, false: c.border }} accessibilityLabel="Remember me" />
            <Txt v="small" color={c.text}>Remember me</Txt>
          </Row>
          <Txt v="caption">Stub IdP (WIF token shape)</Txt>
        </Row>
        {error ? <Txt v="small" color={c.fail}>{error}</Txt> : null}
        <Button size="lg" label="Sign in" icon="log-in-outline" onPress={() => void submit()} />

        <View style={{ gap: 8 }}>
          <Txt v="label">Language</Txt>
          <Row wrap>
            {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
              <Chip key={l} label={LANG_LABEL[l]} selected={lang === l} onPress={() => setSettings({ lang: l })} />
            ))}
          </Row>
        </View>

        <View style={{ gap: 8, marginTop: space.md }}>
          <Txt v="label">Demo personas</Txt>
          {personas.map((p) => (
            <Pressable key={p.id} onPress={() => void submit(p.id)} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.8 : 1 })}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Txt v="bodyStrong" color={c.accentText}>{p.initials}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="bodyStrong">{p.name}</Txt>
                <Txt v="caption">{p.title} · {p.role === 'hq' ? 'HQ web view' : p.shiftId === 'night' ? 'Night shift' : 'Day shift'}</Txt>
              </View>
              <Icon name="chevron-forward" color={c.textMuted} />
            </Pressable>
          ))}
        </View>
        <Txt v="caption" style={{ textAlign: 'center' }}>Synthetic Canopy Mall data. No live Mozart or Gemini calls in DEMO mode.</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
