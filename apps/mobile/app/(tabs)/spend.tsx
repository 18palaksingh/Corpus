import { StyleSheet, Text, View } from 'react-native';

import type { RecommendationKind, Snapshot } from '@corpus/core';
import { color, inr } from '@corpus/core';

import { Screen } from '@/components/Screen';
import { Card, CardHeading, MicroLabel, ScreenHeader } from '@/components/ui';
import { font, layout, space, text } from '@/lib/theme';

const TAG_LABEL: Record<RecommendationKind, string> = {
  best: 'BEST',
  also: 'ALSO',
  avoid: 'AVOID',
  card: 'CARD',
};

const TAG_COLOR: Record<RecommendationKind, string> = {
  best: color.accent,
  also: color.muted,
  avoid: color.negative,
  card: color.muted,
};

export default function SpendScreen() {
  return (
    <Screen>
      {(snapshot) => (
        <>
          <ScreenHeader
            title="Where to spend"
            subhead="The same basket, cheaper. Corpus compares what you actually buy across the places near you and pairs each one with the right card."
          />

          {snapshot.spend.groups.map((group) => (
            <Card key={group.id} flush>
              <View style={layout.cardHeader}>
                <CardHeading>{group.title}</CardHeading>
                <Text style={styles.headerStat}>{group.stat}</Text>
              </View>

              {group.items.map((item, i) => (
                <View
                  key={item.title}
                  style={[
                    styles.recRow,
                    i === 0 && { backgroundColor: color.accentTint, borderTopWidth: 0 },
                  ]}
                >
                  <Text style={[styles.tag, { color: TAG_COLOR[item.kind] }]}>
                    {TAG_LABEL[item.kind]}
                  </Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={text.rowTitle}>{item.title}</Text>
                    <Text style={[text.bodyTight, i === 0 && { color: color.bodyDim }]}>
                      {item.body}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          ))}

          <Routing snapshot={snapshot} />
        </>
      )}
    </Screen>
  );
}

function Routing({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Card flush>
      <View style={layout.cardHeader}>
        <CardHeading>Which card to use where</CardHeading>
      </View>

      {snapshot.spend.routing.map((route) => (
        <View key={route.label} style={styles.routingCell}>
          <MicroLabel>{route.label}</MicroLabel>
          <Text style={styles.routingName}>{route.name}</Text>
          <Text style={text.bodyTight}>{route.body}</Text>
        </View>
      ))}

      {/* The dark cell is the payoff of the row — everything above adds up to this. */}
      <View style={styles.routingCellDark}>
        <MicroLabel onDark>ANNUAL UPSIDE</MicroLabel>
        <Text style={text.darkCardMetric}>{inr(snapshot.spend.annualUpside)}</Text>
        <Text style={[text.bodyTight, { color: color.bodyOnDark }]}>
          {snapshot.spend.annualUpsideCopy}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerStat: {
    fontFamily: font.mono,
    fontSize: 12,
    color: color.accent,
  },
  recRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderTopWidth: 1,
    borderTopColor: color.borderLight,
  },
  // Fixed width so every title starts at the same x, whatever the tag reads.
  tag: {
    fontFamily: font.mono,
    fontSize: 11,
    paddingTop: 3,
    width: 40,
  },
  routingCell: {
    padding: space.cardInnerCell,
    paddingHorizontal: 22,
    gap: 6,
    backgroundColor: color.white,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  routingCellDark: {
    padding: space.cardInnerCell,
    paddingHorizontal: 22,
    gap: 6,
    backgroundColor: color.ink,
  },
  routingName: {
    fontFamily: font.semibold,
    fontSize: 15,
    color: color.ink,
  },
});
