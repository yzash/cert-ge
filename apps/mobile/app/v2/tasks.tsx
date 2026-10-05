import { rankTasks } from '@mozart/actions';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { slaText, STATUS_LABEL, zoneName } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { TaskRow } from '@/v2/cards/core';
import { PageHeader, useWide } from '@/v2/shell';
import { Col, Surface, T } from '@/v2/ui';

export default function Tasks() {
  const s = useView();
  const me = useMe();
  const now = useNow();
  const wide = useWide();
  const ranked = rankTasks(s, me.id, now);
  const other = s.workOrders.filter((w) => w.assigneeId === me.id && !ranked.some((r) => r.wo.id === w.id));
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="My tasks" subtitle="Nearest SLA first, then closest to you" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: wide ? 32 : 12, paddingBottom: 60, gap: 16, maxWidth: 820 }}>
        <Surface style={{ gap: 4 }}>
          {ranked.map((r, i) => <TaskRow key={r.wo.id} id={r.wo.id} title={r.wo.title} sub={`${r.wo.id} · ${slaText(r.minutesToSla)} · ${zoneName(s, r.wo.siteId, r.wo.zoneId)} · ≈${r.distanceM} m`} urgent={r.minutesToSla < 30} first={i === 0} />)}
          {!ranked.length ? <T v="small">Nothing open.</T> : null}
        </Surface>
        <Col gap={6}>
          <T v="label">On hold, awaiting approval or closed</T>
          <Surface style={{ gap: 4 }}>
            {other.map((w) => <TaskRow key={w.id} id={w.id} title={w.title} sub={`${w.id} · ${STATUS_LABEL[w.status]}`} />)}
          </Surface>
        </Col>
      </ScrollView>
    </View>
  );
}
