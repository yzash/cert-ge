import { v2 } from '@mozart/ui';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '@/store/app';
import { Avatar, Btn, Field, GradientText, Icon, Row, T, useV2 } from '@/v2/ui';

const emailFor = (name: string) => `${name.toLowerCase().replace(/\s+/g, '.')}@certisgroup.demo`;

export default function V2SignIn() {
  const c = useV2();
  const view = useApp((s) => s.view)!;
  const signIn = useApp((s) => s.signIn);
  const [email, setEmail] = useState(emailFor('Faizal Rahman'));
  const [err, setErr] = useState('');
  const personas = view.officers.filter((o) => o.persona);
  const go = async (id?: string) => {
    const o = id ? view.officers.find((x) => x.id === id) : view.officers.find((x) => emailFor(x.name) === email.trim().toLowerCase());
    if (!o) return setErr('Unknown account. Pick a demo persona below.');
    await signIn(o.id, true);
    router.replace('/v2/chat');
  };
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ width: '100%', maxWidth: 420, gap: 18 }}>
        <Row gap={10}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.navy, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.onNavy, fontFamily: v2.font.bold, fontSize: 20 }}>M</Text>
          </View>
          <View><T v="title">Mozart</T><T v="caption">Certis Frontline</T></View>
        </Row>
        <GradientText size={34}>Sign in to your shift</GradientText>
        <Field label="Work email" value={email} onChangeText={(t) => { setEmail(t); setErr(''); }} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Password" value="demo-password" secureTextEntry />
        {err ? <T v="small" color={c.fail}>{err}</T> : null}
        <Btn size="lg" kind="navy" label="Continue" onPress={() => void go()} />
        <T v="label" style={{ marginTop: 8 }}>Demo personas</T>
        {personas.map((p) => (
          <Pressable key={p.id} onPress={() => void go(p.id)} accessibilityRole="button"
            style={({ hovered }: { hovered?: boolean }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: hovered ? c.sunken : c.surface })}>
            <Avatar initials={p.initials} size={36} />
            <View style={{ flex: 1 }}><T v="smallStrong">{p.name}</T><T v="caption">{p.title}</T></View>
            <Icon name="arrow-forward" />
          </Pressable>
        ))}
        <T v="caption" style={{ textAlign: 'center' }}>Synthetic Canopy Mall data · stub identity provider</T>
      </View>
    </ScrollView>
  );
}
