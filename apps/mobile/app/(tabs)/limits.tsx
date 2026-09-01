import { StyleSheet, Text, View } from 'react-native';

import type { LimitStatus, Snapshot } from '@corpus/core';
import { barHeight, color, inr } from '@corpus/core';

import { Screen } from '@/components/Screen';
import { Bar, Card, MicroLabel, ScreenHeader } from '@/components/ui';
import { font, layout, space, text } from '@/lib/theme';

const BAR_COLOR: Record<LimitStatus, string> = {
  under: color.positive,
  at: color.warning,
  over: color.negative,
};

export default function LimitsScreen() {
  return (
    <Screen>
      {(snapshot) => (
        <>
          <ScreenHeader
            title="Spending limits"
            subhead="Set against your take-home, your city and your goals, not a generic rule of thumb."
          />
          <Stats snapshot={snapshot} />
          <LimitsTable snapshot={snapshot} />
          {snapshot.limits.highlights.map((highlight) => (
            <Card key={highlight.label} style={styles.highlight}>
              <MicroLabel>{highlight.label}</MicroLabel>
              <Text style={[text.secondaryMetric, highlight.accent && { color: color.accent }]}>
                {highlight.value}
              </Text>
              <Text style={text.body}>{highlight.copy}</Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

function Stats({ snapshot }: { snapshot: Snapshot }) {
  const { limits } = snapshot;
  return (
    <View style={styles.stats}>
      <View style={{ gap: 5 }}>
        <MicroLabel>WITHIN LIMIT</MicroLabel>
        <Text style={styles.statValue}>
          {limits.withinLimit} of {limits.totalCategories}
        </Text>
      </View>
      <View style={{ gap: 5 }}>
        <MicroLabel>RECLAIMABLE</MicroLabel>
        <Text style={[styles.statValue, { color: color.accent }]}>
          {inr(limits.reclaimablePerMonth)}
        </Text>
      </View>
    </View>
  );
}

/**
 * The limits table.
 *
 * Five columns become a block per category: the category and what was spent
 * against its limit, then the usage bar, then what to do about it.
 */
function LimitsTable({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Card flush>
      {snapshot.limits.rows.map((row, i) => (
        <View key={row.id} style={[styles.row, i === 0 && { borderTopWidth: 0 }]}>
          <View style={layout.row}>
            <Text style={text.rowTitle}>{row.label}</Text>
            <Text style={styles.spend}>
              {inr(row.spent)}
              <Text style={{ color: color.muted }}> / {inr(row.limit)}</Text>
            </Text>
          </View>

          <View style={styles.usage}>
            <View style={{ flex: 1 }}>
              <Bar fill={row.fill} fillColor={BAR_COLOR[row.status]} height={barHeight.goal} />
            </View>
            <Text
              style={[
                styles.usagePct,
                { color: row.status === 'over' ? color.negative : color.muted },
              ]}
            >
              {row.usageLabel}
            </Text>
          </View>

          <Text style={text.bodyTight}>{row.note}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    gap: 32,
  },
  statValue: {
    fontFamily: font.mono,
    fontSize: 23,
    color: color.ink,
  },
  row: {
    padding: space.card,
    paddingHorizontal: 22,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: color.borderLight,
  },
  spend: {
    fontFamily: font.mono,
    fontSize: 14,
    color: color.ink,
  },
  usage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  usagePct: {
    fontFamily: font.mono,
    fontSize: 12,
    minWidth: 38,
    textAlign: 'right',
  },
  highlight: {
    padding: space.cardCompact,
    gap: 8,
  },
});
