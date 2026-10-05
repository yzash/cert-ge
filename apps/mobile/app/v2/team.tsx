import React from 'react';
import { ScrollView, View } from 'react-native';
import { AlertCard, ApprovalsCard, TeamCard } from '@/v2/cards/core';
import { PageHeader, useWide } from '@/v2/shell';
import { Col, T } from '@/v2/ui';

export default function Team() {
  const wide = useWide();
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Team" subtitle="Approvals, shift board and broadcasts" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: wide ? 32 : 12, paddingBottom: 60, gap: 16 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          <Col gap={8} style={{ flex: 1, width: '100%' }}><T v="label">Waiting for you</T><ApprovalsCard /></Col>
          <Col gap={16} style={{ width: wide ? 420 : '100%' }}>
            <Col gap={8}><T v="label">Shift board</T><TeamCard /></Col>
            <Col gap={8}><T v="label">Emergency broadcast</T><AlertCard /></Col>
          </Col>
        </View>
      </ScrollView>
    </View>
  );
}
