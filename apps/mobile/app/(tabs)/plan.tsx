import { StyleSheet, Text, View } from 'react-native';

import type { HoldingActionKind, Snapshot } from '@corpus/core';
import { allocationBarColor, barHeight, color, inr, inrCompact, radius } from '@corpus/core';

import { Screen } from '@/components/Screen';
import { Bar, Card, CardHeading, MicroLabel, ScreenHeader } from '@/components/ui';
import { font, layout, space, text } from '@/lib/theme';

const ACTION_COLOR: Record<HoldingActionKind, string> = {
  keep: color.positive,
  'stop-sip': color.negative,
  hold: color.muted,
  review: color.negative,
};

export default function PlanScreen() {
  return (
    <Screen>
      {(snapshot) => (
        <>
          <ScreenHeader
            title="Your investment plan"
            subhead="Built from your income stability, age, dependents, existing holdings and loan rates. Corpus rebalances every quarter and tells you what changed."
          />
          <AllocationCard snapshot={snapshot} />
          <DestinationCard snapshot={snapshot} />
          <HoldingsCard snapshot={snapshot} />
        </>
      )}
    </Screen>
  );
}

/** Bars are filled to the target weight, with the current weight beside them. */
function AllocationCard({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Card style={[layout.cardPadded, { gap: 18 }]}>
      <CardHeading>Target allocation</CardHeading>

      <View style={{ gap: 15 }}>
        {snapshot.allocation.map((row) => (
          <View key={row.assetClass} style={{ gap: 7 }}>
            <View style={layout.row}>
              <Text style={text.rowTitle}>{row.label}</Text>
              <Text style={styles.shift}>{row.shiftLabel}</Text>
            </View>
            <Bar
              fill={row.target}
              fillColor={allocationBarColor[row.assetClass]}
              height={barHeight.allocation}
              round={radius.bar}
            />
          </View>
        ))}
      </View>

      <Text style={styles.footnote}>{snapshot.allocationNote}</Text>
    </Card>
  );
}

function DestinationCard({ snapshot }: { snapshot: Snapshot }) {
  const { plan } = snapshot;

  return (
    <Card dark style={[layout.cardPadded, { gap: 18 }]}>
      <CardHeading onDark>Where the {inr(plan.investable)} goes</CardHeading>

      <View style={styles.darkList}>
        {plan.actions.map((action) => (
          <View key={action.kind} style={styles.darkRow}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.darkRowTitle}>{action.detailTitle}</Text>
              <Text style={styles.darkRowCaption}>{action.caption}</Text>
            </View>
            <Text style={styles.darkRowAmount}>{inr(action.amount)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.darkFooter}>
        <MicroLabel onDark>IF YOU HOLD THIS FOR 12 MONTHS</MicroLabel>
        <Text style={[text.bodyOnDark, { marginTop: 6 }]}>{plan.twelveMonthOutlook}</Text>
      </View>
    </Card>
  );
}

/**
 * The holdings table.
 *
 * Four columns do not fit a phone, so each holding becomes a block: name and
 * value on one line, then the action, then the reason.
 */
function HoldingsCard({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Card flush>
      <View style={layout.cardHeader}>
        <CardHeading>Changes to what you already hold</CardHeading>
      </View>

      {snapshot.holdings.map((holding) => (
        <View key={holding.id} style={styles.holdingRow}>
          <View style={layout.row}>
            <Text style={text.rowTitle}>{holding.name}</Text>
            <Text style={text.tableCellMono}>
              {inrCompact(holding.value, { keepTrailingZero: true })}
            </Text>
          </View>
          <Text style={[styles.action, { color: ACTION_COLOR[holding.actionKind] }]}>
            {holding.action}
          </Text>
          <Text style={text.bodyTight}>{holding.why}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  shift: {
    fontFamily: font.mono,
    fontSize: 13,
    color: color.muted,
  },
  footnote: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 20,
    color: color.muted,
    borderTopWidth: 1,
    borderTopColor: color.track,
    paddingTop: 16,
  },
  darkList: {
    gap: 1,
    backgroundColor: color.surfacePanelBorder,
    borderRadius: radius.innerGroup,
    overflow: 'hidden',
  },
  darkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: color.surfacePanel,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  darkRowTitle: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: color.pageBackground,
  },
  darkRowCaption: {
    fontFamily: font.regular,
    fontSize: 12,
    color: color.mutedOnDark,
  },
  darkRowAmount: {
    fontFamily: font.mono,
    fontSize: 16,
    color: color.pageBackground,
  },
  darkFooter: {
    borderTopWidth: 1,
    borderTopColor: color.surfacePanelBorder,
    paddingTop: 16,
  },
  holdingRow: {
    padding: space.card,
    paddingHorizontal: 22,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: color.borderLight,
  },
  action: {
    fontFamily: font.semibold,
    fontSize: 13,
  },
});
