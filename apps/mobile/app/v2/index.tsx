import { Redirect } from 'expo-router';
import React from 'react';
import { useApp } from '@/store/app';

export default function V2Index() {
  const session = useApp((s) => s.session);
  return <Redirect href={session ? '/v2/chat' : '/v2/sign-in'} />;
}
