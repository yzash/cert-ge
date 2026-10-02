import type { SourceRef } from '@mozart/schema';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '@/lib/theme';
import { Row } from './ui';

const ICON: Record<string, string> = {
  workOrder: 'CWO', incident: 'INC', voiceReport: 'VOICE', verification: 'VERIFY', alarm: 'ALARM', friction: 'FRICTION', handover: 'HANDOVER', checkpoint: 'TOUR', briefing: 'BRIEF', doc: 'DOC',
};

/** Links from a summary line to the record it came from. */
export function SourceChips({ refs }: { refs: SourceRef[] }) {
  const c = useTheme();
  if (!refs.length) return null;
  const go = (r: SourceRef) => {
    if (r.kind === 'workOrder') router.push(`/wo/${r.id}`);
    else if (r.kind === 'verification') router.push({ pathname: '/verify', params: { verificationId: r.id } });
    else if (r.kind === 'doc') router.push(`/doc/${r.id}`);
    else if (r.kind === 'friction') router.push('/friction');
    else if (r.kind === 'checkpoint') router.push('/tour');
    else if (r.kind === 'handover') router.push(`/handover/${r.id}`);
    else router.push({ pathname: '/record/[kind]/[id]', params: { kind: r.kind, id: r.id } });
  };
  return (
    <Row wrap gap={6} style={{ marginTop: 6 }}>
      {refs.map((r) => (
        <Pressable key={`${r.kind}-${r.id}`} accessibilityRole="link" onPress={() => go(r)} hitSlop={6}
          style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>{ICON[r.kind]} · {r.label ?? r.id}</Text>
        </Pressable>
      ))}
    </Row>
  );
}
