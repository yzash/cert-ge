import { rankTasks } from '@mozart/actions';
import { space, radius } from '@mozart/ui';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MicFab } from '@/components/chrome';
import { Button, Card, Icon, IconButton, Pill, Row, Section, Txt, type IconName } from '@/components/ui';
import { ago, clock, slaText, zoneName } from '@/lib/format';
import { useMe, useNow, useOnline, useView } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { pendingIds, useApp } from '@/store/app';

/** F1 Shift Home: what now. */
export default function Home() {
  const c = useTheme();
  const t = useT();
  const s = useView();
  const me = useMe();
  const now = useNow();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const dispatch = useApp((x) => x.dispatch);
  const outbox = useApp((x) => x.outbox);
  const pending = pendingIds(outbox);
  const site = s.sites.find((x) => x.id === me.siteId);
  const ranked = rankTasks(s, me.id, now).slice(0, 3);
  const briefing = s.briefingItems.filter((b) => b.siteId === me.siteId).sort((a, b) => {
    const ua = a.requiresAck && !a.ackByOfficerId[me.id] ? 0 : 1;
    const ub = b.requiresAck && !b.ackByOfficerId[me.id] ? 0 : 1;
    return ua - ub || b.createdAt.localeCompare(a.createdAt);
  });
  const unackedCount = briefing.filter((b) => b.requiresAck && !b.ackByOfficerId[me.id]).length;
  const incomingHandover = s.handovers.find((h) => h.incomingId === me.id && h.signedAt && !h.acknowledgedAt);
  const alarms = s.alarms.filter((a) => a.assigneeId === me.id && a.status !== 'resolved');
  const unread = s.notifications.filter((n) => n.officerId === me.id && !n.read).length;
  const hour = new Date(now).getHours();
  const greet = hour < 5 || hour >= 18 ? 'Good evening' : hour < 12 ? 'Good morning' : 'Good afternoon';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, gap: space.lg, paddingBottom: 130 }}>
        {/* Shift header */}
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Txt v="bodyStrong" color={c.accentText}>{me.initials}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="title">{greet}, {me.name.split(' ')[0]}</Txt>
            <Txt v="caption">{me.shiftId === 'night' ? 'Night shift 19:00–07:00' : 'Day shift 07:00–19:00'} · {site?.short} · {zoneName(s, me.siteId, me.zoneId)}</Txt>
          </View>
          <IconButton icon="notifications-outline" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />
        </Row>
        <Row>
          <Pill tone={online ? 'pass' : 'attention'} icon={online ? 'cloud-done-outline' : 'cloud-offline-outline'} label={online ? t('online') : `${t('offline')} · cached`} />
          <Pill tone="muted" icon="shield-checkmark-outline" label={me.title} />
        </Row>

        {incomingHandover ? (
          <Card tone="info" onPress={() => router.push(`/handover/${incomingHandover.id}`)}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Icon name="swap-horizontal" color={c.info} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt v="label" color={c.info}>Handover from {s.officers.find((o) => o.id === incomingHandover.outgoingId)?.name}</Txt>
                <Txt v="bodyStrong">{incomingHandover.headline}</Txt>
                <Txt v="caption">Signed {clock(incomingHandover.signedAt)} · tap to read and acknowledge</Txt>
              </View>
            </Row>
          </Card>
        ) : null}

        {/* Briefing */}
        {unackedCount ? <Section title={t('briefing')} right={unackedCount ? <Pill tone="accent" label={`${unackedCount} to acknowledge`} /> : <Pill tone="pass" label="All acknowledged" icon="checkmark" />}>
          {briefing.filter((b) => b.requiresAck && !b.ackByOfficerId[me.id]).map((b) => {
            const acked = b.ackByOfficerId[me.id];
            const needs = b.requiresAck && !acked;
            return (
              <Card key={b.id} tone={needs ? 'accent' : undefined}>
                <View style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Pill tone={b.type === 'policyUpdate' ? 'accent' : b.type === 'alert' ? 'fail' : 'info'} label={b.type === 'policyUpdate' ? (needs ? 'NEW POLICY UPDATE' : 'Policy update') : b.type === 'alert' ? 'Alert' : 'Site instruction'} />
                    <Txt v="caption">{ago(b.createdAt, now)}</Txt>
                  </Row>
                  <Txt v="bodyStrong">{b.title}</Txt>
                  <Txt v="small" numberOfLines={needs ? undefined : 2}>{b.body}</Txt>
                  <Row wrap>
                    {b.sopId ? <Button size="sm" kind="ghost" icon="document-text-outline" label={`Open ${b.sopId}`} onPress={() => router.push(`/doc/${b.sopId}`)} /> : null}
                    {needs ? (
                      <Button size="sm" icon="checkmark-circle" label={t('acknowledge')} onPress={() => dispatch({ type: 'briefing.ack', itemId: b.id }, { confirm: true })} />
                    ) : acked ? (
                      <Pill tone="pass" icon="checkmark" label={`Acknowledged ${clock(acked)}${pending.has(b.id) ? ' · pending sync' : ''}`} />
                    ) : null}
                  </Row>
                </View>
              </Card>
            );
          })}
        </Section> : null}

        {/* Next tasks */}
        <Section title={t('nextTasks')} right={<Pressable onPress={() => router.push('/tasks')}><Txt v="small" color={c.primary} style={{ fontWeight: '700' }}>All tasks</Txt></Pressable>}>
          {ranked.length === 0 ? <Card><Txt v="small">No open tasks. Patrol as rostered.</Txt></Card> : null}
          {ranked.map((r, i) => {
            const pc = r.wo.priority === 'critical' || r.wo.priority === 'high' ? c.fail : r.wo.priority === 'medium' ? c.attention : c.info;
            return (
              <Card key={r.wo.id} onPress={() => router.push(`/wo/${r.wo.id}`)} style={{ borderLeftWidth: 5, borderLeftColor: pc }} accessibilityLabel={`Task ${r.wo.title}`}>
                <View style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row>
                      {i === 0 ? <Pill tone="accent" label="NOW" /> : null}
                      <Txt v="mono" color={c.textMuted}>{r.wo.id}</Txt>
                    </Row>
                    <Pill status={r.wo.status} label={r.wo.status === 'assignment' ? 'Assignment' : r.wo.status === 'acknowledged' ? 'Acknowledged' : 'In Progress'} />
                  </Row>
                  <Txt v="bodyStrong">{r.wo.title}</Txt>
                  <Row wrap gap={12}>
                    <Row gap={4}><Icon name="time-outline" size={16} color={r.minutesToSla < 30 ? c.fail : c.textMuted} /><Txt v="small" color={r.minutesToSla < 30 ? c.fail : undefined} style={{ fontWeight: '700' }}>{slaText(r.minutesToSla)}</Txt></Row>
                    <Row gap={4}><Icon name="location-outline" size={16} color={c.textMuted} /><Txt v="small">{zoneName(s, r.wo.siteId, r.wo.zoneId)} · ≈{r.distanceM} m</Txt></Row>
                  </Row>
                </View>
              </Card>
            );
          })}
        </Section>

        {/* Rest of briefing */}
        <Section title={unackedCount ? 'Also in the briefing' : t('briefing')} right={unackedCount ? undefined : <Pill tone="pass" label="All acknowledged" icon="checkmark" />}>
          {briefing.filter((b) => !(b.requiresAck && !b.ackByOfficerId[me.id])).slice(0, 4).map((b) => {
            const acked = b.ackByOfficerId[me.id];
            const needs = b.requiresAck && !acked;
            return (
              <Card key={b.id} tone={needs ? 'accent' : undefined}>
                <View style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Pill tone={b.type === 'policyUpdate' ? 'accent' : b.type === 'alert' ? 'fail' : 'info'} label={b.type === 'policyUpdate' ? (needs ? 'NEW POLICY UPDATE' : 'Policy update') : b.type === 'alert' ? 'Alert' : 'Site instruction'} />
                    <Txt v="caption">{ago(b.createdAt, now)}</Txt>
                  </Row>
                  <Txt v="bodyStrong">{b.title}</Txt>
                  <Txt v="small" numberOfLines={needs ? undefined : 2}>{b.body}</Txt>
                  <Row wrap>
                    {b.sopId ? <Button size="sm" kind="ghost" icon="document-text-outline" label={`Open ${b.sopId}`} onPress={() => router.push(`/doc/${b.sopId}`)} /> : null}
                    {needs ? (
                      <Button size="sm" icon="checkmark-circle" label={t('acknowledge')} onPress={() => dispatch({ type: 'briefing.ack', itemId: b.id }, { confirm: true })} />
                    ) : acked ? (
                      <Pill tone="pass" icon="checkmark" label={`Acknowledged ${clock(acked)}${pending.has(b.id) ? ' · pending sync' : ''}`} />
                    ) : null}
                  </Row>
                </View>
              </Card>
            );
          })}
        </Section>

        {/* Open alarms */}
        <Section title={t('openAlarms')}>
          {alarms.length === 0 ? <Txt v="small">None assigned to you.</Txt> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {alarms.map((a) => (
                <Pressable key={a.id} onPress={() => (a.workOrderId ? router.push(`/wo/${a.workOrderId}`) : dispatch({ type: 'alarm.ack', alarmId: a.id }))}
                  style={{ width: 220, padding: space.md, borderRadius: radius.md, backgroundColor: a.status === 'open' ? c.failBg : c.attentionBg, borderWidth: 1, borderColor: a.status === 'open' ? c.fail : c.attention, gap: 4 }}>
                  <Row gap={6}><Icon name="alert-circle" size={16} color={a.status === 'open' ? c.fail : c.attention} /><Txt v="caption" color={a.status === 'open' ? c.fail : c.attention} style={{ fontWeight: '800' }}>{a.status.toUpperCase()} · {ago(a.raisedAt, now)}</Txt></Row>
                  <Txt v="small" color={c.text} numberOfLines={2} style={{ fontWeight: '600' }}>{a.title}</Txt>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Section>

        {/* Quick actions */}
        <Row wrap gap={space.sm}>
          {([
            ['camera-outline', t('verify'), '/verify'],
            ['flag-outline', t('friction'), '/friction'],
            ['swap-horizontal-outline', t('handover'), '/handover'],
            ['chatbubbles-outline', 'Ask Mozart', '/ask'],
          ] as [IconName, string, string][]).map(([ic, label, to]) => (
            <Pressable key={to} onPress={() => router.push(to as never)} accessibilityRole="button" accessibilityLabel={label}
              style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, minHeight: 64, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.8 : 1 })}>
              <Icon name={ic} color={c.primary} />
              <Txt v="bodyStrong">{label}</Txt>
            </Pressable>
          ))}
        </Row>
      </ScrollView>
      <MicFab label={t('holdToReport')} onPress={() => router.push('/report')} />
    </View>
  );
}
