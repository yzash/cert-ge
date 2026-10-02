import { space } from '@mozart/ui';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SignatureView } from '@/components/media';
import { SourceChips } from '@/components/sources';
import { Button, Card, Pill, Row, Screen, Section, Txt } from '@/components/ui';
import { clock, officerName } from '@/lib/format';
import { useMe, useView } from '@/lib/hooks';
import { pendingIds, useApp } from '@/store/app';

/** Handover detail: incoming officer reads and acknowledges; supervisor sees status. */
export default function HandoverView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const pending = pendingIds(useApp((x) => x.outbox));
  const h = s.handovers.find((x) => x.id === id);
  if (!h) return <Screen title="Handover" back><Txt>Not found (it may still be syncing from the other device).</Txt></Screen>;
  const canAck = h.incomingId === me.id && !h.acknowledgedAt;
  return (
    <Screen title="Handover" subtitle={`${officerName(s, h.outgoingId)} → ${officerName(s, h.incomingId)}`} back>
      <Row wrap>
        <Pill tone="info" label={`Signed ${clock(h.signedAt)}`} />
        <Pill tone={h.acknowledgedAt ? 'pass' : 'attention'} label={h.acknowledgedAt ? `Acknowledged ${clock(h.acknowledgedAt)}` : 'Not yet acknowledged'} />
        {pending.has(h.id) ? <Pill tone="attention" label="Pending sync" /> : null}
      </Row>
      <Txt v="title">{h.headline}</Txt>
      {h.summary.map((sec) => (
        <Section key={sec.id} title={sec.title}>
          {sec.items.map((it) => (
            <Card key={it.id} style={{ padding: space.md }}>
              <Txt>{it.text}</Txt>
              <SourceChips refs={it.sourceRefs} />
            </Card>
          ))}
        </Section>
      ))}
      {h.notes ? <Card><Txt v="label">Notes</Txt><Txt>{h.notes}</Txt></Card> : null}
      <View style={{ gap: 6 }}>
        <Txt v="label">Signature</Txt>
        <SignatureView sig={h.signature} />
      </View>
      {canAck ? (
        <Button size="lg" icon="checkmark-done" label="I have read this. Acknowledge" onPress={() => { dispatch({ type: 'handover.ack', handoverId: h.id }); router.back(); }} />
      ) : null}
    </Screen>
  );
}
