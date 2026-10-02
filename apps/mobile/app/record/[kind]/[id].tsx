import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { AttachmentStrip } from '@/components/attach';
import { Card, KeyValue, Pill, Screen, Txt } from '@/components/ui';
import { clock, officerName, sopLabel, zoneName } from '@/lib/format';
import { useView } from '@/lib/hooks';

/** Generic viewer for incidents, voice reports and alarms linked from summaries. */
export default function RecordView() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const s = useView();
  if (kind === 'incident') {
    const r = s.incidents.find((x) => x.id === id);
    if (!r) return <Screen title={id} back><Txt>Not found.</Txt></Screen>;
    return (
      <Screen title={r.id} subtitle="Incident" back>
        <Pill status={r.severity} label={`${r.severity} severity`} />
        <Txt v="h2">{r.type}</Txt>
        <Txt>{r.description}</Txt>
        <Card>
          <KeyValue k="Location" v={r.location || zoneName(s, r.siteId, r.zoneId)} />
          <KeyValue k="Reporter" v={officerName(s, r.reporterId)} />
          <KeyValue k="Created" v={clock(r.createdAt)} />
          {r.sopId ? <KeyValue k="SOP" v={sopLabel(s, r.sopId)} /> : null}
          <KeyValue k="Confirmed by officer" v={r.confirmedAt ? clock(r.confirmedAt) : 'n/a'} />
        </Card>
        <AttachmentStrip items={r.attachments} />
      </Screen>
    );
  }
  if (kind === 'voiceReport') {
    const r = s.voiceReports.find((x) => x.id === id);
    if (!r) return <Screen title={id} back><Txt>Not found.</Txt></Screen>;
    return (
      <Screen title="Voice report" subtitle={r.id} back>
        <Txt style={{ fontStyle: 'italic' }}>“{r.transcript}”</Txt>
        <Card>
          <KeyValue k="Linked record" v={r.linkedRecordId ?? '—'} />
          <KeyValue k="AI type" v={r.extractedDraft.type ?? '—'} />
          <KeyValue k="Officer type" v={r.confirmedDraft?.type ?? '—'} />
          <KeyValue k="AI severity" v={r.extractedDraft.severity ?? '—'} />
          <KeyValue k="Officer severity" v={r.confirmedDraft?.severity ?? '—'} />
        </Card>
      </Screen>
    );
  }
  const a = s.alarms.find((x) => x.id === id);
  return (
    <Screen title={id} subtitle="Alarm" back>
      {a ? <><Txt v="title">{a.title}</Txt><Pill status={a.status} label={a.status} /><Txt v="small">Raised {clock(a.raisedAt)}</Txt></> : <Txt>Not found.</Txt>}
    </Screen>
  );
}
