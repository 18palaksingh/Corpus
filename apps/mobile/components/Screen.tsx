import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Snapshot } from '@corpus/core';

import { useSnapshot } from '@/lib/SnapshotContext';
import { color, font, layout, radius, text } from '@/lib/theme';

import { Button, CachedBanner, Loading } from './ui';

/**
 * The shell every screen sits in.
 *
 * Handles the three states the design left open — loading, the offline
 * fallback, and a failed sync — in one place, so no screen has to repeat them.
 * Pull to refresh reruns the fetch; "Recalculate" reruns the model itself.
 */
export function Screen({
  title,
  children,
}: {
  title?: string;
  children: (snapshot: Snapshot) => React.ReactNode;
}) {
  const { snapshot, source, loading, refreshing, refresh, recalculate } = useSnapshot();

  if (loading || !snapshot) {
    return (
      <SafeAreaView style={layout.screen} edges={['top']}>
        <Loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={layout.screen} edges={['top']}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{title ?? snapshot.user.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {snapshot.user.subtitle}
          </Text>
        </View>
        <View style={styles.period}>
          <Text style={styles.periodLabel}>{snapshot.period.label}</Text>
        </View>
        <Button
          label={refreshing ? 'Working' : 'Recalculate'}
          variant="accent"
          onPress={() => void recalculate()}
          busy={refreshing}
        />
      </View>

      <ScrollView
        contentContainerStyle={layout.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={color.muted} />
        }
      >
        {source === 'cached' && <CachedBanner onRetry={() => void refresh()} retrying={refreshing} />}
        {children(snapshot)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: color.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  name: {
    fontFamily: font.semibold,
    fontSize: 15,
    color: color.ink,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 12,
    color: color.muted,
    marginTop: 1,
  },
  period: {
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.white,
    borderRadius: radius.control,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  periodLabel: {
    fontFamily: font.medium,
    fontSize: 12,
    color: color.ink,
  },
});

export { text, layout };
