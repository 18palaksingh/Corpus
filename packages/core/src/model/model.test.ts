import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ANANYA } from '../data/persona.js';
import { buildSnapshot } from './index.js';
import { groupIndian, inr, inrCompact, inrDelta, periodLabel, timestampLabel } from '../format.js';
import { monthsToClear } from './loans.js';

const snapshot = buildSnapshot(ANANYA);

/**
 * These assertions pin the model to the figures the design was drawn against.
 * If one fails, either the model changed or the persona did — check which
 * before updating the expectation.
 */

test('cashflow reconciles income, commitments and variable spend', () => {
  const { cashflow } = snapshot;
  assert.equal(cashflow.totalIncome, 214_000);
  assert.equal(cashflow.fixedCommitments, 86_500);
  assert.equal(cashflow.variableSpend, 75_100);
  assert.equal(cashflow.surplus, 52_400);
  assert.equal(cashflow.surplusVsAverage, 6_100);
  assert.equal(
    cashflow.totalIncome - cashflow.fixedCommitments - cashflow.variableSpend,
    cashflow.surplus,
  );
});

test('rent is not double-counted across commitments and the limits table', () => {
  const rentCommitment = ANANYA.commitments.find((c) => c.id === 'rent')!.monthlyAmount;
  const rentCategory = ANANYA.period.categories.find((c) => c.id === 'rent')!.spent;
  assert.equal(rentCommitment, rentCategory);

  const allCategories = ANANYA.period.categories.reduce((s, c) => s + c.spent, 0);
  assert.equal(
    snapshot.cashflow.variableSpend,
    allCategories - rentCategory + ANANYA.period.otherVariableSpend,
  );
});

test('score is 78 with three of four segments filled', () => {
  assert.equal(snapshot.score.value, 78);
  assert.equal(snapshot.score.segmentsFilled, 3);
  assert.equal(snapshot.score.totalSegments, 4);
  assert.equal(
    snapshot.score.summary,
    "Strong. You are on track for two of three goals. This month's plan closes the third.",
  );
});

test('score summary never leaks a factor breakdown', () => {
  for (const banned of ['weight', 'pillar', 'factor', '%']) {
    assert.ok(
      !snapshot.score.summary.toLowerCase().includes(banned),
      `score summary should not mention "${banned}"`,
    );
  }
});

test('the plan splits the surplus into buffer and three actions', () => {
  const { plan } = snapshot;
  assert.equal(plan.buffer, 14_400);
  assert.equal(plan.investable, 38_000);
  assert.equal(plan.buffer + plan.investable, snapshot.cashflow.surplus);

  assert.deepEqual(
    plan.actions.map((a) => [a.kind, a.amount]),
    [
      ['invest', 22_000],
      ['prepay', 9_000],
      ['park', 7_000],
    ],
  );
  assert.equal(
    plan.actions.reduce((s, a) => s + a.amount, 0),
    plan.investable,
  );
});

test('plan steps are numbered in display order', () => {
  assert.deepEqual(
    snapshot.plan.actions.map((a) => a.stepLabel),
    ['01 · INVEST', '02 · PREPAY', '03 · PARK'],
  );
});

test('the plan is scheduled for the 2nd of the following month', () => {
  assert.equal(snapshot.plan.scheduledFor.slice(0, 10), '2026-09-02');
  assert.equal(
    snapshot.plan.footerNote,
    'Approve once and Corpus schedules all three for 2 September.',
  );
});

test('twelve months on the plan projects a score of 86', () => {
  assert.equal(snapshot.plan.projectedScore, 86);
  assert.ok(snapshot.plan.twelveMonthOutlook.startsWith('Corpus score moves 78 to 86.'));
  assert.ok(snapshot.plan.twelveMonthOutlook.includes('retirement goal returns to on-track'));
});

test('goals report progress, and the behind goal reports its shortfall', () => {
  assert.deepEqual(
    snapshot.goals.map((g) => [g.id, g.rightValue, g.caption]),
    [
      ['emergency', '68%', '₹8.2L of ₹12L · complete by Jun 2027'],
      ['home', '31%', '₹9.3L of ₹30L · on track for 2030'],
      ['retirement', 'Behind', 'Needs ₹22,000 a month more · the plan starts it'],
    ],
  );
  assert.equal(Math.round(snapshot.goals[2]!.fill * 100), 22);
});

test('alerts are ordered urgent, advisory, opportunity', () => {
  assert.deepEqual(
    snapshot.alerts.map((a) => a.severity),
    ['urgent', 'advisory', 'advisory', 'opportunity'],
  );
});

test('the card alert sizes the payment to land inside the band', () => {
  const alert = snapshot.alerts.find((a) => a.id === 'card-utilisation-aurum')!;
  assert.equal(alert.title, 'Card utilisation at 62%');
  assert.equal(
    alert.body,
    'Pay ₹18,000 on the Aurum card before 4 September to keep your score band.',
  );
});

test('only overspends with a routed alternative raise an alert', () => {
  // Eating out is 140% over — worse than groceries — but has no cheaper
  // alternative on the "Where to spend" screen, so it raises no alert.
  const ids = snapshot.alerts.map((a) => a.id);
  assert.ok(ids.includes('overspend-groceries'));
  assert.ok(!ids.includes('overspend-eating-out'));
});

test('80C headroom is reported with the months left to fill it', () => {
  const alert = snapshot.alerts.find((a) => a.id === 'section-80c')!;
  assert.equal(alert.title, '₹46,000 of 80C left');
  assert.equal(alert.body, 'Seven months to fill it without a March scramble.');
});

test('limits count five of seven categories within limit', () => {
  assert.equal(snapshot.limits.withinLimit, 5);
  assert.equal(snapshot.limits.totalCategories, 7);
  assert.equal(snapshot.limits.reclaimablePerMonth, 9_400);
});

test('over-limit bars clamp their fill but not their percentage', () => {
  const groceries = snapshot.limits.rows.find((r) => r.id === 'groceries')!;
  assert.equal(groceries.status, 'over');
  assert.equal(groceries.usageLabel, '118%');
  assert.equal(groceries.fill, 1);

  const household = snapshot.limits.rows.find((r) => r.id === 'household')!;
  assert.equal(household.status, 'at');
  assert.equal(household.usageLabel, '99%');
});

test('holdings the plan already acts on are left out of the review table', () => {
  assert.equal(snapshot.holdings.length, 5);
  assert.ok(!snapshot.holdings.some((h) => h.id === 'liquid'));
  assert.deepEqual(
    snapshot.holdings.map((h) => h.action),
    ['Keep', 'Stop SIP', "Hold, don't add", 'Review', 'Keep'],
  );
});

test('allocation reports the shift from current to target', () => {
  assert.deepEqual(
    snapshot.allocation.map((a) => a.shiftLabel),
    ['54% → 62%', '21% → 20%', '15% → 10%', '10% → 8%'],
  );
});

test('spend guidance derives its header stats from budget data', () => {
  assert.deepEqual(
    snapshot.spend.groups.map((g) => g.stat),
    ['SAVE ₹2,300/MO', '₹31,000 LEFT THIS YEAR'],
  );
  assert.equal(snapshot.spend.annualUpside, 41_600);
});

test('chrome copy is derived, not hardcoded', () => {
  assert.equal(snapshot.user.subtitle, 'Bengaluru · Salaried · 2 dependents');
  assert.equal(snapshot.period.label, 'August 2026');
  assert.equal(snapshot.sync.summary, '4 accounts, 2 cards and 6 holdings in sync.');
  assert.equal(timestampLabel(snapshot.sync.lastRunAt), '28 Aug 2026, 6:40 am');
});

test('the profile collapses deposit accounts and totals commitments', () => {
  assert.equal(snapshot.profile.commitmentsTotal, 86_500);
  assert.equal(snapshot.profile.accounts.length, 1);
  assert.equal(snapshot.profile.accounts[0]!.caption, 'Two banks, refreshed this morning');
  assert.deepEqual(
    snapshot.profile.cards.map((c) => [c.utilisationLabel, c.tone]),
    [
      ['62% used', 'negative'],
      ['19% used', 'positive'],
    ],
  );
});

test('the snapshot is a pure function of its input', () => {
  const a = buildSnapshot(ANANYA, new Date('2026-09-01T00:00:00Z'));
  const b = buildSnapshot(ANANYA, new Date('2026-09-01T00:00:00Z'));
  assert.deepEqual(a, b);
});

test('INR formatting uses Indian digit grouping', () => {
  assert.equal(groupIndian(205000), '2,05,000');
  assert.equal(groupIndian(52400), '52,400');
  assert.equal(groupIndian(13000000), '1,30,00,000');
  assert.equal(inr(400000), '₹4,00,000');
  assert.equal(inrDelta(6100), '↑ ₹6,100');
  assert.equal(periodLabel('2026-08-01'), 'August 2026');
});

test('balances abbreviate at lakh and crore scale', () => {
  assert.equal(inrCompact(1840000), '₹18.4L');
  assert.equal(inrCompact(600000, { keepTrailingZero: true }), '₹6.0L');
  assert.equal(inrCompact(13000000), '₹1.3Cr');
  assert.equal(inrCompact(52400), '₹52,400');
});

test('amortisation clears a loan and rejects a payment below the interest', () => {
  // ₹7.67L at 9.4% on an ₹18,600 EMI is the persona's car loan.
  assert.equal(monthsToClear(767_000, 18_600, 0.094), 50);
  assert.equal(monthsToClear(767_000, 27_600, 0.094), 32);
  assert.equal(monthsToClear(767_000, 100, 0.094), Number.POSITIVE_INFINITY);
  assert.equal(monthsToClear(0, 18_600, 0.094), 0);
});

test('a user with no surplus gets no plan actions rather than a negative one', () => {
  const broke = {
    ...ANANYA,
    income: { ...ANANYA.income, monthlyTakeHome: 90_000 },
  };
  const result = buildSnapshot(broke);
  assert.ok(result.cashflow.surplus <= 0);
  assert.equal(result.plan.investable, 0);
  assert.equal(result.plan.actions.length, 0);
  assert.ok(result.score.value >= 0 && result.score.value <= 100);
});

test('a user with no cards produces no utilisation alert and no divide-by-zero', () => {
  const cardless = buildSnapshot({ ...ANANYA, cards: [] });
  assert.ok(!cardless.alerts.some((a) => a.id.startsWith('card-utilisation')));
  assert.ok(Number.isFinite(cardless.score.value));
  assert.equal(cardless.profile.cards.length, 0);
});
