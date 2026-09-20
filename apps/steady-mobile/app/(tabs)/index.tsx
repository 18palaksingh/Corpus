import { NOT_A_DIAGNOSIS } from '@steady/core';
import { useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { ActionRow, BandPill, Banner, Button, Caption, Card, EnergyStrip, MetaLabel, Note } from '@/components/ui';
import { describeAge, useSteady } from '@/lib/SteadyContext';
import { color, space, styles } from '@/lib/theme';

/** Where each suggestion kind goes. */
const ROUTE: Record<string, string> = {
  'check-in': '/pulse',
  reset: '/reset',
  unfreeze: '/unfreeze',
  insight: '/week',
  care: '/care',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Home.
 *
 * Same contract as the web's `/today`: a band, one sentence of evidence, one
 * next action. The only thing this screen has that the web does not is the
 * stale banner, because a phone is the client that actually goes offline.
 */
export default function TodayScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { snapshot, loading, stale, fetchedAt, error, refresh } = useSteady();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (loading && !snapshot) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={color.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
    >
      {stale ? (
        <Banner tone="stale">
          Showing your last synced check-ins from {describeAge(fetchedAt)}. Steady could not
          reach the server, so this may not be current. Pull down to try again.
        </Banner>
      ) : null}

      {error ? <Banner tone="error">{error}</Banner> : null}

      <Text style={styles.h1}>
        {greeting()}
        {snapshot?.displayName ? `, ${snapshot.displayName}` : ''}
      </Text>

      {snapshot ? (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <MetaLabel>Burnout signal</MetaLabel>
              <BandPill band={snapshot.signal.band} />
            </View>

            <Text style={styles.bodyLarge}>
              {snapshot.signal.confident
                ? snapshot.signal.evidence
                : `${snapshot.signal.checkInCount} of ${snapshot.signal.windowDays} days checked in. A few more and Steady can tell you what it is seeing.`}
            </Text>

            <View style={{ marginTop: space.md }}>
              <EnergyStrip series={snapshot.energySeries} />
            </View>
            <MetaLabel>Last {snapshot.signal.windowDays} days · energy</MetaLabel>
          </Card>

          {snapshot.careOffered ? (
            <Card>
              <MetaLabel>Support</MetaLabel>
              <Text style={styles.h2}>Let&rsquo;s get you support</Text>
              <Text style={styles.body}>{snapshot.signal.suggestion.reason}</Text>
              <Button label="See the options" onPress={() => router.push('/care')} />
            </Card>
          ) : null}

          <MetaLabel>Suggested for you</MetaLabel>
          <ActionRow
            title={snapshot.signal.suggestion.label}
            detail={snapshot.signal.suggestion.reason}
            onPress={() => router.push((ROUTE[snapshot.signal.suggestion.kind] ?? '/') as never)}
          />
          {snapshot.signal.suggestion.kind !== 'unfreeze' ? (
            <ActionRow
              title="Unfreeze a task"
              detail="Paste the thing you are stuck on and get a first step."
              onPress={() => router.push('/unfreeze')}
            />
          ) : (
            <ActionRow
              title="90-sec blank-mind reset"
              detail="One tap, works offline."
              onPress={() => router.push('/reset')}
            />
          )}

          {snapshot.recentWins.length > 0 ? (
            <Card>
              <MetaLabel>Recent wins</MetaLabel>
              {snapshot.recentWins.map((win) => (
                <Text key={win} style={styles.body}>
                  · {win}
                </Text>
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <Text style={styles.body}>
            Nothing to show yet. Pull down to refresh once you are back online.
          </Text>
        </Card>
      )}

      <Note>{NOT_A_DIAGNOSIS}</Note>
      <Caption>Account and privacy · pull down to refresh</Caption>
      <Button
        label="Account and privacy"
        variant="secondary"
        onPress={() => router.push('/profile')}
      />
    </ScrollView>
  );
}
