import { latestPayslip } from '@mozart/actions';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useMe, useView } from '@/lib/hooks';
import { useChat } from '@/v2/chatStore';
import { LeaveBalanceCard, LicenceCard, RequestsList, RosterCard } from '@/v2/cards/hr';
import { sendMessage } from '@/v2/engine';
import { PageHeader, useWide } from '@/v2/shell';
import { router } from 'expo-router';
import { Btn, Col, Row, Surface, T } from '@/v2/ui';

/** HR & pay hub. Every action opens the matching card in chat. */
export default function Requests() {
  const s = useView();
  const me = useMe();
  const wide = useWide();
  const slip = latestPayslip(s, me.id);
  const ask = async (text: string) => {
    const chat = useChat.getState();
    const id = chat.newThread(me.id, 'hr');
    router.push('/v2/chat');
    await sendMessage(id, text, me, 'hr');
  };
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="HR & pay" subtitle="From the Certis HR system · actions need your confirmation" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: wide ? 32 : 12, paddingBottom: 60, gap: 16, maxWidth: 900 }}>
        <Row wrap gap={8}>
          <Btn icon="calendar-outline" label="Apply for leave" onPress={() => void ask('Apply annual leave')} />
          <Btn kind="soft" icon="medkit-outline" label="I’m sick (MC)" onPress={() => void ask('I am sick today, apply MC')} />
          <Btn kind="soft" icon="receipt-outline" label="Make a claim" onPress={() => void ask('I want to claim a taxi')} />
          <Btn kind="soft" icon="swap-horizontal" label="Swap a shift" onPress={() => void ask('Swap my night shift')} />
          <Btn kind="soft" icon="wallet-outline" label="Payslip" onPress={() => void ask('Show my payslip')} />
        </Row>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
          <Col gap={8} style={{ flex: 1 }}><T v="label">Leave</T><LeaveBalanceCard /></Col>
          <Col gap={8} style={{ flex: 1 }}><T v="label">My requests</T><RequestsList />
            {slip ? <Surface style={{ gap: 2 }}><T v="caption">Latest payslip</T><T v="smallStrong">{slip.period} · paid {slip.paidOn} · {slip.overtimeHours} h overtime</T></Surface> : null}
          </Col>
        </View>
        <Col gap={8}><T v="label">Next two weeks</T><RosterCard /></Col>
        <Col gap={8}><T v="label">Licences & certifications</T><LicenceCard /></Col>
      </ScrollView>
    </View>
  );
}
