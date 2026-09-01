import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import type { Alert as CorpusAlert, Snapshot } from '@corpus/core';
import {
  assetClassColor,
  barHeight,
  color,
  dayMonth,
  inr,
  inrCompact,
  inrDelta,
  monthYear,
  pctSigned,
  planHeaderNote,
} from '@corpus/core';

import { Screen } from '@/components/Screen';
import { Bar, Button, Card, CardHeading, DetailRow, MicroLabel } from '@/components/ui';
import { approvePlan } from '@/lib/api';
import { useSnapshot } from '@/lib/SnapshotContext';
import { font, layout, radius, space, text } from '@/lib/theme';

/** Dot colour encodes urgency: red urgent, amber advisory, green opportunity. */
const DOT: Record<CorpusAlert['severity'], string> = {
  urgent: color.negative,
  advisory: color.warning,
  opportunity: color.positive,
};

const ALERT_ROUTE = {
  dashboard: '/',
  plan: '/plan',
  limits: '/limits',
  spend: '/spend',
  profile: '/profile',
} as const;

export default function DashboardScreen() {
  return (
    <Screen>
      {(snapshot) => (
        <>
          <ScoreCard snapshot={snapshot} />
          <SurplusCard snapshot={snapshot} />
          <PortfolioCard snapshot={snapshot} />
          <PlanCard snapshot={snapshot} />
          <AlertsCard snapshot={snapshot} />
          <GoalsCard snapshot={snapshot} />
        </>
      )}
    </Screen>
  );
}

/** A number, a four-segment bar and one sentence. Never a factor breakdown. */
function ScoreCard({ snapshot }: { snapshot: Snapshot }) {
  const { score } = snapshot;
  return (
    <Card dark style={styles.scoreCard}>
      <MicroLabel onDark>CORPUS SCORE</MicroLabel>
      <View style={styles.scoreValue}>
        <Text style={text.heroMetric}>{score.value}</Text>
        <Text style={styles.scoreOutOf}>/100</Text>
      </View>
      <View style={styles.segments}>
        {Array.from({ length: score.totalSegments }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, i < score.segmentsFilled && { backgroundColor: color.accentLight }]}
          />
        ))}
      </View>
      <Text style={text.bodyOnDark}>{score.summary}</Text>
    </Card>
  );
}

function SurplusCard({ snapshot }: { snapshot: Snapshot }) {
  const { cashflow } = snapshot;
  const up = cashflow.surplusVsAverage >= 0;

  return (
    <Card style={layout.cardPadded}>
      <MicroLabel>MONTHLY SURPLUS</MicroLabel>
      <Text style={text.cardMetric}>{inr(cashflow.surplus)}</Text>
      <Text style={[styles.delta, { color: up ? color.positive : color.negative }]}>
        {inrDelta(cashflow.surplusVsAverage)} vs. your six-month average
      </Text>
      <View style={{ gap: 7, marginTop: 4 }}>
        <BreakdownRow label="Take-home" value={inr(cashflow.totalIncome)} />
        <BreakdownRow label="Fixed commitments" value={inr(cashflow.fixedCommitments)} />
        <BreakdownRow label="Variable spend" value={inr(cashflow.variableSpend)} />
      </View>
    </Card>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={layout.row}>
      <Text style={[text.body, { lineHeight: 18 }]}>{label}</Text>
      <Text style={[text.tableCellMono, { fontSize: 13 }]}>{value}</Text>
    </View>
  );
}

function PortfolioCard({ snapshot }: { snapshot: Snapshot }) {
  const { portfolio } = snapshot;
  const up = portfolio.xirr >= 0;

  return (
    <Card style={layout.cardPadded}>
      <MicroLabel>PORTFOLIO</MicroLabel>
      <Text style={text.cardMetric}>{inrCompact(portfolio.totalValue)}</Text>
      <Text style={[styles.delta, { color: up ? color.positive : color.negative }]}>
        {pctSigned(portfolio.xirr)} XIRR since {monthYear(portfolio.xirrSince)}
      </Text>

      <View style={{ gap: 9, marginTop: 4 }}>
        <View style={styles.stackedBar}>
          {portfolio.segments.map((segment) => (
            <View
              key={segment.assetClass}
              style={{ flex: segment.weight * 100, backgroundColor: assetClassColor[segment.assetClass] }}
            />
          ))}
        </View>
        <View style={styles.legend}>
          {portfolio.segments.map((segment) => (
            <Text key={segment.assetClass} style={text.caption}>
              {segment.label}
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
}

/**
 * The month's plan.
 *
 * The desktop shows the three actions side by side; on a phone they stack, so
 * the step label and amount lead each one and the reason follows. Approval
 * still goes through a confirmation — it moves real money.
 */
function PlanCard({ snapshot }: { snapshot: Snapshot }) {
  const { plan } = snapshot;
  const { refresh } = useSnapshot();
  const [scheduled, setScheduled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function confirm() {
    Alert.alert(
      `Approve ${inr(plan.investable)} for ${dayMonth(plan.scheduledFor)}?`,
      plan.actions.map((a) => `${a.title} — ${inr(a.amount)}`).join('\n') +
        '\n\nCorpus will set up each instruction on your linked accounts. You can cancel any of them before they execute.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Approve', style: 'default', onPress: () => void submit() },
      ],
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      await approvePlan(
        plan.scheduledFor,
        plan.actions.map((a) => ({ kind: a.kind, amount: a.amount })),
      );
      setScheduled(true);
      await refresh();
    } catch (error) {
      Alert.alert('Could not schedule', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card flush>
      <View style={layout.cardHeader}>
        <CardHeading>This month&rsquo;s plan</CardHeading>
      </View>
      <View style={styles.planNote}>
        <Text style={layout.cardHeaderMeta}>{planHeaderNote(plan)}</Text>
      </View>

      {plan.actions.map((action) => (
        <View key={action.kind} style={styles.planAction}>
          <View style={layout.row}>
            <Text style={styles.stepLabel}>{action.stepLabel}</Text>
            <Text style={text.planFigure}>{inr(action.amount)}</Text>
          </View>
          <Text style={text.rowTitle}>{action.title}</Text>
          <Text style={text.body}>{action.reason}</Text>
        </View>
      ))}

      <View style={styles.planFooter}>
        {scheduled ? (
          <Text style={styles.scheduled}>
            Scheduled for {dayMonth(plan.scheduledFor)}. Corpus will confirm once each one executes.
          </Text>
        ) : (
          <>
            <Text style={[text.body, { marginBottom: 12 }]}>{plan.footerNote}</Text>
            <Button label="Approve plan" onPress={confirm} busy={submitting} />
          </>
        )}
      </View>
    </Card>
  );
}

function AlertsCard({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Card flush>
      <View style={[layout.cardHeader, { borderBottomWidth: 0, paddingBottom: 13 }]}>
        <CardHeading>Needs your attention</CardHeading>
      </View>

      {snapshot.alerts.map((alert) => {
        const row = (
          <View style={styles.alertRow}>
            <View style={[styles.dot, { backgroundColor: DOT[alert.severity] }]} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={text.rowTitle}>{alert.title}</Text>
              <Text style={text.bodyTight}>{alert.body}</Text>
            </View>
          </View>
        );

        return alert.linkTo ? (
          <Link key={alert.id} href={ALERT_ROUTE[alert.linkTo]} asChild>
            <View accessibilityRole="link">{row}</View>
          </Link>
        ) : (
          <View key={alert.id}>{row}</View>
        );
      })}
    </Card>
  );
}

function GoalsCard({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Card style={[layout.cardPadded, { gap: 18 }]}>
      <View style={layout.row}>
        <CardHeading>Goals</CardHeading>
        <Text style={layout.cardHeaderMeta}>Projected on the approved plan</Text>
      </View>

      {snapshot.goals.map((goal) => (
        <View key={goal.id} style={{ gap: 10 }}>
          <View style={layout.row}>
            <Text style={text.rowTitle}>{goal.label}</Text>
            <Text
              style={[
                styles.goalValue,
                { color: goal.onTrack ? color.muted : color.negative },
              ]}
            >
              {goal.rightValue}
            </Text>
          </View>
          <Bar
            fill={goal.fill}
            fillColor={goal.onTrack ? color.accent : color.negative}
            height={barHeight.goal}
          />
          <Text style={text.caption}>{goal.caption}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  scoreCard: {
    padding: space.card,
    gap: 16,
  },
  scoreValue: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  scoreOutOf: {
    fontFamily: font.mono,
    fontSize: 15,
    color: color.mutedOnDark,
    paddingBottom: 8,
  },
  segments: {
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    height: barHeight.score,
    flex: 1,
    borderRadius: 2,
    backgroundColor: '#33373F',
  },
  delta: {
    fontFamily: font.medium,
    fontSize: 13,
  },
  stackedBar: {
    flexDirection: 'row',
    height: barHeight.stacked,
    borderRadius: radius.bar,
    overflow: 'hidden',
    gap: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  planNote: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  planAction: {
    padding: space.cardInnerCell,
    paddingHorizontal: 22,
    gap: 8,
    backgroundColor: color.white,
    borderTopWidth: 1,
    borderTopColor: color.border,
    marginTop: 12,
  },
  stepLabel: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: color.accent,
  },
  planFooter: {
    padding: 20,
    paddingHorizontal: 22,
    backgroundColor: color.subtleFill,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  scheduled: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 20,
    color: color.positive,
  },
  alertRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: color.borderLight,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  goalValue: {
    fontFamily: font.mono,
    fontSize: 13,
  },
});
