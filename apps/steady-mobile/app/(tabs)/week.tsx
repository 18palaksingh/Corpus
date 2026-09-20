import type { WeeklyInsight } from '@steady/core';
import { NOT_A_DIAGNOSIS } from '@steady/core';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, Caption, Card, MetaLabel, Note } from '@/components/ui';
import { addWin, fetchInsight, type CrisisCopy } from '@/lib/api';
import { color, fontSize, space, styles } from '@/lib/theme';

/**
 * "Your week, in brief."
 *
 * Fetched on focus rather than held in the shared context: it is a weekly
 * read, not the app's core state, and it changes when a win is added on this
 * very screen.
 */
export default function WeekScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [win, setWin] = useState('');
  const [savingWin, setSavingWin] = useState(false);
  const [crisis, setCrisis] = useState<CrisisCopy | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setInsight(await fetchInsight());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your week');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function saveWin(): Promise<void> {
    if (win.trim().length < 2 || savingWin) return;
    setSavingWin(true);

    try {
      const response = await addWin(win);
      if (response.crisis && response.copy) {
        setCrisis(response.copy);
        return;
      }
      setWin('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that');
    } finally {
      setSavingWin(false);
    }
  }

  if (loading && !insight) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={color.primary} />
      </View>
    );
  }

  const delta = insight?.energyDeltaPercent ?? null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h1}>Your week, in brief</Text>

      {error ? <Banner tone="error">{error}</Banner> : null}

      {insight ? (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <View>
                <MetaLabel>Energy</MetaLabel>
                <Text style={[styles.numeric, { fontSize: fontSize.heading }]}>
                  {delta === null
                    ? '—'
                    : `${delta > 0 ? '↑' : delta < 0 ? '↓' : ''} ${Math.abs(delta)}%`}
                </Text>
                <Caption>
                  {delta === null ? 'No previous week yet' : 'vs. last week'}
                </Caption>
              </View>
              <View>
                <MetaLabel>Check-ins</MetaLabel>
                <Text style={[styles.numeric, { fontSize: fontSize.heading }]}>
                  {insight.checkInCount} / {insight.windowDays}
                </Text>
              </View>
            </View>
          </Card>

          {insight.pattern ? (
            <Card>
              <MetaLabel>Pattern we noticed</MetaLabel>
              <Text style={styles.bodyLarge}>{insight.pattern}</Text>
            </Card>
          ) : null}

          <Card>
            <MetaLabel>Wins this week</MetaLabel>
            {insight.wins.length > 0 ? (
              insight.wins.map((entry) => (
                <Text key={entry} style={styles.body}>
                  · {entry}
                </Text>
              ))
            ) : (
              <Caption>
                Nothing logged yet. A win can be small — &ldquo;asked two clarifying
                questions&rdquo; counts.
              </Caption>
            )}

            {crisis ? (
              <Note>
                {crisis.heading}. {crisis.action}
              </Note>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={win}
                  onChangeText={setWin}
                  maxLength={280}
                  placeholder="Asked for the example I needed"
                  placeholderTextColor={color.mutedLight}
                />
                <Button
                  label="Add it"
                  variant="secondary"
                  onPress={() => void saveWin()}
                  disabled={win.trim().length < 2}
                  busy={savingWin}
                />
              </>
            )}
          </Card>

          <Card>
            <MetaLabel>Try this next week</MetaLabel>
            <Text style={styles.bodyLarge}>{insight.experiment}</Text>
            <Caption>
              One small thing, two days. Not a rule, and nothing tracks whether you did it.
            </Caption>
          </Card>
        </>
      ) : null}

      <Note>{NOT_A_DIAGNOSIS}</Note>
    </ScrollView>
  );
}
