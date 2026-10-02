import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useApp } from '@/store/app';

/** Entry: route by role. `/?as=o-meiling` signs this tab in as a persona (presenter shortcut). */
export default function Index() {
  const { as } = useLocalSearchParams<{ as?: string }>();
  const session = useApp((s) => s.session);
  const view = useApp((s) => s.view);
  const signIn = useApp((s) => s.signIn);
  const [done, setDone] = useState(!as);

  useEffect(() => {
    if (as && view?.officers.some((o) => o.id === as)) void signIn(as, true).then(() => setDone(true));
    else setDone(true);
  }, [as]);

  if (!done) return null;
  if (!session) return <Redirect href="/sign-in" />;
  const me = view?.officers.find((o) => o.id === session.officerId);
  if (me?.role === 'hq') return <Redirect href="/hq" />;
  if (me?.role === 'supervisor') return <Redirect href="/team" />;
  return <Redirect href="/home" />;
}
