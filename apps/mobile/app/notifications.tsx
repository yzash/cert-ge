import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Card, Empty, Icon, Row, Screen, Txt, type IconName } from '@/components/ui';
import { ago } from '@/lib/format';
import { useMe, useView } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { useApp } from '@/store/app';

const ICON: Record<string, IconName> = {
  friction: 'flag', briefing: 'megaphone', closure: 'checkmark-done', handover: 'swap-horizontal', escalation: 'arrow-up-circle', tour: 'walk', alert: 'warning', info: 'information-circle',
};

export default function Notifications() {
  const c = useTheme();
  const s = useView();
  const me = useMe();
  const dispatch = useApp((x) => x.dispatch);
  const mine = s.notifications.filter((n) => n.officerId === me.id);
  const unread = mine.filter((n) => !n.read).map((n) => n.id);

  useEffect(() => {
    if (unread.length) dispatch({ type: 'notification.read', ids: unread }, { quiet: true });
  }, [unread.join(',')]);

  return (
    <Screen title="Notifications" back>
      {mine.length === 0 ? <Empty text="No notifications." /> : null}
      {mine.map((n) => (
        <Card key={n.id} onPress={n.link ? () => router.push(n.link as never) : undefined}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name={ICON[n.kind] ?? 'notifications'} color={n.read ? c.textMuted : c.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="bodyStrong">{n.title}</Txt>
              <Txt v="small">{n.body}</Txt>
              <Txt v="caption">{ago(n.at)}</Txt>
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
