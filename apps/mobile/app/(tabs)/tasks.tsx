import { space, radius } from '@mozart/ui';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Chip, Icon, IconButton, Pill, Row, Screen, Txt } from '@/components/ui';
import { slaText, STATUS_LABEL, zoneName } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { pendingIds, useApp } from '@/store/app';

const TYPES = [['all', 'All'], ['corrective', 'Corrective'], ['planned', 'Planned'], ['adhoc', 'Ad hoc']] as const;
const STATES = [['open', 'Open'], ['pending_approval', 'Awaiting approval'], ['on_hold', 'On hold'], ['closed', 'Closed']] as const;

/** Screen 3: Mobility V2's work-order list, plus a Verify camera shortcut per order. */
export default function Tasks() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const now = useNow();
  const outbox = useApp((x) => x.outbox);
  const pending = pendingIds(outbox);
  const [type, setType] = useState<(typeof TYPES)[number][0]>('all');
  const [state, setState] = useState<(typeof STATES)[number][0]>('open');

  const mine = s.workOrders.filter((w) => w.assigneeId === me.id);
  const counts = {
    in_progress: mine.filter((w) => ['acknowledged', 'in_progress', 'assignment'].includes(w.status)).length,
    completed: mine.filter((w) => w.status === 'closed' || w.status === 'pending_approval').length,
    on_hold: mine.filter((w) => w.status === 'on_hold').length,
  };
  const list = mine
    .filter((w) => type === 'all' || w.type === type)
    .filter((w) => (state === 'open' ? ['assignment', 'acknowledged', 'in_progress'].includes(w.status) : w.status === state))
    .sort((a, b) => Number(pending.has(b.id) && b.source === 'voice') - Number(pending.has(a.id) && a.source === 'voice') || a.slaDue.localeCompare(b.slaDue));

  return (
    <Screen title="Work orders" subtitle={`${me.name} · ${mine.length} assigned`} right={<IconButton icon="camera-outline" label="Verify with camera" onPress={() => router.push('/verify')} />}>
      <Row gap={space.sm}>
        {([['In progress', counts.in_progress, c.primary], ['Completed', counts.completed, c.pass], ['On hold', counts.on_hold, c.textMuted]] as const).map(([l, n, col]) => (
          <View key={l} style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: c.border }}>
            <Txt v="h2" color={col}>{n}</Txt>
            <Txt v="caption">{l}</Txt>
          </View>
        ))}
      </Row>
      <Row wrap>{TYPES.map(([k, l]) => <Chip key={k} label={l} selected={type === k} onPress={() => setType(k)} />)}</Row>
      <Row wrap>{STATES.map(([k, l]) => <Chip key={k} label={l} selected={state === k} onPress={() => setState(k)} />)}</Row>
      {list.length === 0 ? <Txt v="small">Nothing here.</Txt> : null}
      {list.map((w) => {
        const verifyStep = w.steps.find((st) => st.expectedState && !st.verificationId);
        const mins = Math.round((Date.parse(w.slaDue) - now) / 60000);
        return (
          <Card key={w.id} onPress={() => router.push(`/wo/${w.id}`)} accessibilityLabel={`${w.id} ${w.title}`}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Row wrap>
                  <Txt v="mono" color={c.textMuted}>{w.id}</Txt>
                  <Pill status={w.status} label={STATUS_LABEL[w.status]} />
                  {w.source === 'voice' ? <Pill tone="purple" icon="mic" label="Voice" /> : null}
                  {pending.has(w.id) ? <Pill tone="attention" icon="cloud-upload-outline" label="Pending sync" /> : null}
                </Row>
                <Txt v="bodyStrong">{w.title}</Txt>
                <Txt v="caption">{w.type[0].toUpperCase() + w.type.slice(1)} · {w.category} · {zoneName(s, w.siteId, w.zoneId)}</Txt>
                {w.status !== 'closed' && w.status !== 'pending_approval' ? (
                  <Txt v="caption" color={mins < 30 ? c.fail : c.textMuted} style={{ fontWeight: '700' }}>{slaText(mins)}</Txt>
                ) : null}
                <Row gap={4}>
                  {w.steps.map((st) => <View key={st.id} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: st.done ? c.pass : c.border }} />)}
                </Row>
              </View>
              {verifyStep && w.status !== 'closed' ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Verify ${w.id} with camera`}
                  onPress={() => router.push({ pathname: '/verify', params: { woId: w.id, stepId: verifyStep.id, assetId: w.assetId ?? '' } })}
                  style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.primary }}>
                  <Icon name="camera" color={c.primary} />
                </Pressable>
              ) : null}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
