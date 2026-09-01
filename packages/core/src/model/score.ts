import type { CashflowSummary, ScoreBreakdown, UserInput } from '../types.js';
import { cardinal, ordinal } from './words.js';
import {
  ADHERENCE_FACTOR,
  ALLOCATION_DRIFT_CEILING,
  CREDIT_UTILISATION_FLOOR,
  CREDIT_UTILISATION_SPAN,
  DEBT_LOAD_CEILING,
  EMERGENCY_TARGET_MONTHS,
  SCORE_SEGMENTS,
  SCORE_WEIGHTS,
  TARGET_SAVINGS_RATE,
} from './constants.js';
import { creditUtilisation, totalEmi } from './cashflow.js';
import { behindGoals, isOnTrack } from './goals.js';

/**
 * The Corpus score.
 *
 * Six pillars, each scored 0–100 and combined on fixed weights. The pillars and
 * weights never leave this module: the product shows a number, a four-segment
 * bar and one sentence. No breakdown, no "how this was calculated" expander.
 * See `constants.ts`.
 */

type Pillars = Record<keyof typeof SCORE_WEIGHTS, number>;

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

function pillars(user: UserInput, cashflow: CashflowSummary): Pillars {
  // How much of what comes in is not spent.
  const savingsRate =
    cashflow.totalIncome === 0 ? 0 : cashflow.surplus / cashflow.totalIncome;

  // Months of essential outgo the emergency fund covers.
  const emergency = user.goals.find((g) => g.id === 'emergency');
  const cover =
    emergency && user.essentialMonthlyOutgo > 0
      ? emergency.current / user.essentialMonthlyOutgo
      : 0;

  // Goals on track score full; a goal that is behind scores its own progress,
  // so a goal that is behind but nearly funded still carries some weight.
  const goalScores = user.goals.map((g) =>
    isOnTrack(g) ? 100 : clamp100((g.target === 0 ? 0 : g.current / g.target) * 100),
  );

  // What share of income is already promised to lenders.
  const emiRatio = cashflow.totalIncome === 0 ? 0 : totalEmi(user) / cashflow.totalIncome;

  // Total distance between where the portfolio is and where it should be.
  const drift = (Object.keys(user.portfolio.target) as (keyof typeof user.portfolio.target)[])
    .reduce((sum, key) => sum + Math.abs(user.portfolio.current[key] - user.portfolio.target[key]), 0) * 100;

  const utilisation = creditUtilisation(user);

  return {
    savingsRate: clamp100((savingsRate / TARGET_SAVINGS_RATE) * 100),
    emergencyCover: clamp100((cover / EMERGENCY_TARGET_MONTHS) * 100),
    goalTrack: goalScores.length === 0 ? 100 : goalScores.reduce((a, b) => a + b, 0) / goalScores.length,
    debtLoad: clamp100((1 - emiRatio / DEBT_LOAD_CEILING) * 100),
    allocationFit: clamp100((1 - drift / ALLOCATION_DRIFT_CEILING) * 100),
    creditHealth:
      utilisation <= CREDIT_UTILISATION_FLOOR
        ? 100
        : clamp100((1 - (utilisation - CREDIT_UTILISATION_FLOOR) / CREDIT_UTILISATION_SPAN) * 100),
  };
}

function combine(p: Pillars): number {
  return (Object.keys(SCORE_WEIGHTS) as (keyof Pillars)[]).reduce(
    (sum, key) => sum + SCORE_WEIGHTS[key] * p[key],
    0,
  );
}

/** The raw, unrounded score. Exposed only to the projection below. */
function rawScore(user: UserInput, cashflow: CashflowSummary): number {
  return combine(pillars(user, cashflow));
}

export function computeScore(user: UserInput, cashflow: CashflowSummary): ScoreBreakdown {
  const raw = rawScore(user, cashflow);
  const value = Math.round(raw);

  return {
    value,
    segmentsFilled: Math.max(0, Math.min(SCORE_SEGMENTS, Math.round((value / 100) * SCORE_SEGMENTS))),
    totalSegments: SCORE_SEGMENTS,
    summary: summarise(user, value),
  };
}

/**
 * Where the score lands after twelve months on the plan.
 *
 * The plan moves three pillars: the emergency fund fills (monthly top-up plus
 * the earmarked bonus), the behind goal comes back on track, and new money
 * closes the allocation drift. Nothing else is assumed to change — in
 * particular, credit utilisation and the EMI load stay where they are, because
 * the plan does not act on them.
 *
 * The modelled gain is then discounted by the cohort's observed adherence.
 * Promising the full modelled improvement would systematically overshoot.
 */
export function projectScore(user: UserInput, cashflow: CashflowSummary, monthlyPark: number): number {
  const baseline = rawScore(user, cashflow);
  const current = pillars(user, cashflow);

  const emergency = user.goals.find((g) => g.id === 'emergency');
  const projectedEmergency =
    emergency && user.essentialMonthlyOutgo > 0
      ? (emergency.current + monthlyPark * 12 + Math.min(user.income.expectedAnnualBonus, emergency.target - emergency.current)) /
        user.essentialMonthlyOutgo
      : 0;

  const projected: Pillars = {
    ...current,
    emergencyCover: clamp100((projectedEmergency / EMERGENCY_TARGET_MONTHS) * 100),
    // Twelve months of the plan's SIP closes the shortfall on the behind goal.
    goalTrack: 100,
    // New money reaches the target weights well inside a year.
    allocationFit: 100,
  };

  const improvement = combine(projected) - baseline;
  return Math.round(baseline + improvement * ADHERENCE_FACTOR);
}

/**
 * One line of plain English. Never a factor breakdown — see the note at the top
 * of this module.
 */
function summarise(user: UserInput, value: number): string {
  const band = value >= 85 ? 'Excellent' : value >= 70 ? 'Strong' : value >= 55 ? 'Steady' : 'Needs work';
  const total = user.goals.length;
  const behind = behindGoals(user);
  const onTrack = total - behind.length;

  if (behind.length === 0) {
    return `${band}. All ${cardinal(total)} goals are on track. This month's plan keeps them there.`;
  }

  const standing = `You are on track for ${cardinal(onTrack)} of ${cardinal(total)} goals.`;

  const closing =
    behind.length === 1
      ? `This month's plan closes the ${ordinal(total)}.`
      : `This month's plan closes ${cardinal(behind.length)} of them.`;

  return `${band}. ${standing} ${closing}`;
}
