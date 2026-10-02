import { hasEvidence } from '@mozart/actions';
import { space, radius } from '@mozart/ui';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AttachmentStrip, PhotoPicker } from '@/components/attach';
import { SceneImage, SignaturePad, SignatureView } from '@/components/media';
import { Button, Card, Divider, Field, Icon, KeyValue, Pill, Row, Screen, Section, Txt } from '@/components/ui';
import { assetName, clock, officerName, slaText, sopLabel, STATUS_LABEL, zoneName } from '@/lib/format';
import { useMe, useNow, useView } from '@/lib/hooks';
import { speechSupported, startDictation } from '@/lib/speech';
import { useTheme } from '@/lib/theme';
import { pendingIds, useApp } from '@/store/app';

/** Screen 4: work-order detail. Mobility V2 step checklist + Speak note, Verify, Attach. Close requires evidence. */
export default function WorkOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const now = useNow();
  const dispatch = useApp((x) => x.dispatch);
  const lang = useApp((x) => x.settings.lang);
  const pending = pendingIds(useApp((x) => x.outbox));
  const wo = s.workOrders.find((w) => w.id === id);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [listening, setListening] = useState<null | (() => void)>(null);
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const [sig, setSig] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (!wo) return <Screen title="Work order" back><Txt>Not found.</Txt></Screen>;
  const asset = s.assets.find((a) => a.id === wo.assetId);
  const mins = Math.round((Date.parse(wo.slaDue) - now) / 60000);
  const isMine = wo.assigneeId === me.id;
  const isSup = me.role === 'supervisor';
  const evidence = hasEvidence(wo);
  const open = !['closed', 'pending_approval'].includes(wo.status);
  const voice = wo.sourceRecordId ? s.voiceReports.find((v) => v.id === wo.sourceRecordId) : undefined;

  const saveNote = (stepId: string) => {
    if (!note.trim()) return;
    dispatch({ type: 'wo.note', woId: wo.id, stepId, note: note.trim() });
    setNote('');
    setNoteFor(null);
  };

  return (
    <Screen title={wo.id} subtitle={wo.category} back right={pending.has(wo.id) ? <Pill tone="attention" label="Pending sync" /> : undefined}>
      <View style={{ gap: 8 }}>
        <Row wrap>
          <Pill status={wo.status} label={STATUS_LABEL[wo.status]} />
          <Pill status={wo.priority} label={`${wo.priority[0].toUpperCase()}${wo.priority.slice(1)} priority`} />
          <Pill tone="muted" label={wo.type} />
          {wo.source === 'voice' ? <Pill tone="purple" icon="mic" label="From voice report" /> : null}
        </Row>
        <Txt v="h2">{wo.title}</Txt>
        <Txt v="small">{wo.description}</Txt>
      </View>

      <Card>
        <View style={{ gap: 8 }}>
          {asset ? <KeyValue k="Asset" v={`${asset.name} (${asset.tag})`} /> : null}
          <KeyValue k="Location" v={zoneName(s, wo.siteId, wo.zoneId)} />
          <KeyValue k="Assignee" v={officerName(s, wo.assigneeId)} />
          {open ? <KeyValue k="SLA" v={`${slaText(mins)} (${clock(wo.slaDue)})`} color={mins < 30 ? c.fail : undefined} /> : null}
          {wo.sopId ? (
            <Pressable onPress={() => router.push(`/doc/${wo.sopId}`)}>
              <KeyValue k="SOP" v={sopLabel(s, wo.sopId)} color={c.primary} />
            </Pressable>
          ) : null}
        </View>
      </Card>

      {voice ? (
        <Card>
          <Txt v="label">Spoken report</Txt>
          <Txt v="small" style={{ fontStyle: 'italic', marginTop: 4 }}>“{voice.transcript}”</Txt>
        </Card>
      ) : null}

      {wo.rejectedReason && open ? (
        <Card tone="fail"><Txt v="bodyStrong">Closure returned by supervisor</Txt><Txt v="small">{wo.rejectedReason}</Txt></Card>
      ) : null}

      {isMine && open ? (
        <Row wrap>
          {wo.status === 'assignment' ? <Button icon="checkmark-done" label="Acknowledge" onPress={() => dispatch({ type: 'wo.status', woId: wo.id, status: 'acknowledged' })} /> : null}
          {wo.status === 'acknowledged' || wo.status === 'on_hold' ? <Button icon="play" label="Start" onPress={() => dispatch({ type: 'wo.status', woId: wo.id, status: 'in_progress' })} /> : null}
          {wo.status === 'in_progress' ? <Button kind="secondary" icon="pause" label="Put on hold" onPress={() => dispatch({ type: 'wo.status', woId: wo.id, status: 'on_hold' })} /> : null}
          <Button kind="ghost" icon="flag-outline" label="This doesn’t work" onPress={() => router.push({ pathname: '/friction', params: { assetId: wo.assetId ?? '', sopId: wo.sopId ?? '' } })} />
        </Row>
      ) : null}

      <Section title="Steps">
        {wo.steps.map((st, i) => {
          const ver = st.verificationId ? s.verifications.find((v) => v.id === st.verificationId) : undefined;
          const verdict = ver?.override ?? ver?.verdict;
          return (
            <Card key={st.id} style={{ padding: space.md }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: st.done }}
                  accessibilityLabel={st.label}
                  disabled={!isMine || !open}
                  onPress={() => dispatch({ type: 'wo.step', woId: wo.id, stepId: st.id, done: !st.done })}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: st.done ? c.pass : c.border, backgroundColor: st.done ? c.pass : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {st.done ? <Icon name="checkmark" size={18} color="#04210F" /> : <Txt v="caption">{i + 1}</Txt>}
                  </View>
                </Pressable>
                <View style={{ flex: 1, gap: 6, paddingTop: 10 }}>
                  <Txt v="bodyStrong" style={{ textDecorationLine: st.done ? 'line-through' : 'none', opacity: st.done ? 0.75 : 1 }}>{st.label}</Txt>
                  {st.expectedState ? <Txt v="caption">Expected: {st.expectedState.indicator} → {st.expectedState.expected}</Txt> : null}
                  {ver ? (
                    <View style={{ gap: 6 }}>
                      <Row>
                        <Pill status={verdict} label={`${verdict!.toUpperCase()}${ver.override ? ' (override)' : ''}`} icon={verdict === 'pass' ? 'checkmark-circle' : verdict === 'fail' ? 'close-circle' : 'alert-circle'} />
                        <Txt v="caption">{Math.round(ver.confidence * 100)}% · {clock(ver.createdAt)}</Txt>
                      </Row>
                      <Pressable onPress={() => router.push({ pathname: '/verify', params: { verificationId: ver.id } })}>
                        <SceneImage uri={ver.imageUri} height={120} />
                      </Pressable>
                      <Txt v="caption">{ver.overrideReason ? `Override: ${ver.overrideReason}` : ver.reason}</Txt>
                    </View>
                  ) : null}
                  {st.notes.map((n, k) => <Txt key={k} v="small">• {n}</Txt>)}
                  <AttachmentStrip items={st.attachments} />
                  {isMine && open ? (
                    <Row wrap gap={6}>
                      <Button size="sm" kind="ghost" icon="mic-outline" label="Speak note" onPress={() => { setNoteFor(noteFor === st.id ? null : st.id); setNote(''); }} />
                      {st.expectedState || asset ? (
                        <Button size="sm" kind="ghost" icon="camera-outline" label="Verify with camera"
                          onPress={() => router.push({ pathname: '/verify', params: { woId: wo.id, stepId: st.id, assetId: wo.assetId ?? '' } })} />
                      ) : null}
                      <Button size="sm" kind="ghost" icon="attach" label="Attach" onPress={() => setAttachFor(attachFor === st.id ? null : st.id)} />
                    </Row>
                  ) : null}
                  {noteFor === st.id ? (
                    <View style={{ gap: 6 }}>
                      <Field label="Note" value={note} onChangeText={setNote} placeholder={speechSupported() ? 'Tap the mic and speak, or type' : 'Type a note'} multiline />
                      <Row>
                        {speechSupported() ? (
                          <Button size="sm" kind={listening ? 'danger' : 'secondary'} icon={listening ? 'stop' : 'mic'} label={listening ? 'Stop' : 'Dictate'}
                            onPress={() => {
                              if (listening) { listening(); setListening(null); return; }
                              const stop = startDictation(lang, setNote, () => setListening(null));
                              setListening(() => stop);
                            }} />
                        ) : null}
                        <Button size="sm" label="Save note" onPress={() => saveNote(st.id)} disabled={!note.trim()} />
                      </Row>
                    </View>
                  ) : null}
                  {attachFor === st.id ? (
                    <PhotoPicker assetId={wo.assetId} onPick={(a) => { dispatch({ type: 'wo.attach', woId: wo.id, stepId: st.id, attachment: a }); setAttachFor(null); }} />
                  ) : null}
                </View>
              </Row>
            </Card>
          );
        })}
      </Section>

      {wo.attachments.length ? (
        <Section title="Attachments"><AttachmentStrip items={wo.attachments} /></Section>
      ) : null}

      {isMine && open ? (
        <Card>
          <View style={{ gap: space.md }}>
            <Txt v="title">Close the job</Txt>
            <Row>
              <Icon name={evidence ? 'checkmark-circle' : 'alert-circle'} color={evidence ? c.pass : c.attention} />
              <Txt v="small" color={evidence ? c.pass : c.attention} style={{ flex: 1 }}>
                {evidence ? 'Evidence attached.' : 'Close requires evidence: verify with the camera or attach a photo (SOP-OPS-004).'}
              </Txt>
            </Row>
            <SignaturePad onChange={setSig} />
            <Button size="lg" icon="lock-closed" label="Sign and close" disabled={!evidence || !sig}
              onPress={() => {
                const r = dispatch({ type: 'wo.requestClose', woId: wo.id, signature: sig! }, { confirm: true });
                if (r.ok) useApp.getState().toast({ kind: 'success', title: `${wo.id} closed`, body: 'Sent to your supervisor for approval.' });
              }} />
          </View>
        </Card>
      ) : null}

      {wo.status === 'pending_approval' ? (
        <Card tone="attention">
          <View style={{ gap: space.md }}>
            <Txt v="bodyStrong">Awaiting supervisor approval</Txt>
            <Txt v="caption">Closed by {officerName(s, wo.confirmedBy)} at {clock(wo.closeRequestedAt)}</Txt>
            <SignatureView sig={wo.signature} />
            {isSup ? (
              rejecting ? (
                <View style={{ gap: 8 }}>
                  <Field label="Reason" value={reason} onChangeText={setReason} placeholder="What is missing?" />
                  <Row><Button kind="danger" label="Return to officer" disabled={!reason.trim()} onPress={() => { dispatch({ type: 'closure.reject', woId: wo.id, reason }, { confirm: true }); setRejecting(false); }} /><Button kind="ghost" label="Cancel" onPress={() => setRejecting(false)} /></Row>
                </View>
              ) : (
                <Row>
                  <Button kind="success" icon="checkmark-circle" label="Approve closure" onPress={() => dispatch({ type: 'closure.approve', woId: wo.id }, { confirm: true })} style={{ flex: 1 }} />
                  <Button kind="secondary" label="Return" onPress={() => setRejecting(true)} />
                </Row>
              )
            ) : null}
          </View>
        </Card>
      ) : null}
      {wo.status === 'closed' ? (
        <Card tone="pass"><Txt v="bodyStrong">Closed {clock(wo.closedAt)}</Txt><Txt v="caption">Approved by {officerName(s, wo.approvedBy)}</Txt><Divider /><SignatureView sig={wo.signature} /></Card>
      ) : null}
      {asset ? <Txt v="caption">Asset {assetName(s, asset.id)} · tag {asset.tag}</Txt> : null}
    </Screen>
  );
}
