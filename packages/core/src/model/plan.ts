import type { CashflowSummary, MonthlyPlan, PlanAction, UserInput } from '../types.js';
import { dayMonth, inr, monthYear, pctPrecise } from '../format.js';
import {
  EMERGENCY_SAFETY_MARGIN,
  EXECUTION_DAY,
  PLAN_ROUNDING,
  SIP_DAY,
} from './constants.js';
import { addMonths, dayOfNextMonth, monthsBetween } from './dates.js';
import { behindGoals } from './goals.js';
import { prepaymentTarget, projectLoan } from './loans.js';

/**
 * The monthly plan.
 *
 * The surplus splits into a buffer and an investable pool. The buffer is the
 * p90 overshoot of variable spend across the last six periods — hold that back
 * and a bad month costs the user nothing, rather than forcing a redemption.
 *
 * The pool is then allocated in priority order:
 *
 *   1. INVEST — close the highest-priority goal that is behind.
 *   2. PARK   — put the emergency fund on schedule for its target date.
 *   3. PREPAY — the residual goes to the highest-rate loan worth prepaying.
 *
 * Prepayment is last because it is the only one with no deadline: the loan's
 * rate is fixed, so a rupee sent to it next month buys almost exactly what a
 * rupee sent this month does. The goals have dates; the loan does not.
 *
 * The screens display the actions as INVEST / PREPAY / PARK — the order the
 * user reads them in, not the order they were allocated.
 */
export function computePlan(user: UserInput, cashflow: CashflowSummary, currentScore: number, projectedScore: number): MonthlyPlan {
  const buffer = Math.min(user.period.variableSpendVolatility, Math.max(0, cashflow.surplus));
  const investable = Math.max(0, cashflow.surplus - buffer);

  let remaining = investable;

  // 1. INVEST — the behind goal's monthly shortfall, capped by the pool.
  const behind = behindGoals(user);
  const investTarget = behind[0];
  const investAmount = investTarget ? Math.min(investTarget.monthlyShortfall, remaining) : 0;
  remaining -= investAmount;

  // 2. PARK — what keeps the emergency fund on schedule.
  const parkAmount = Math.min(emergencyTopUp(user), remaining);
  remaining -= parkAmount;

  // 3. PREPAY — the residual, if there is a loan worth prepaying.
  const loanCommitment = prepaymentTarget(user.commitments);
  const prepayAmount = loanCommitment ? remaining : 0;

  const actions: PlanAction[] = [];
  let step = 0;

  if (investAmount > 0 && investTarget) {
    actions.push({
      kind: 'invest',
      stepLabel: stepLabel(++step, 'INVEST'),
      amount: investAmount,
      title: 'Broad-market index SIP',
      detailTitle: 'Broad-market index fund',
      caption: `Monthly SIP, ${ordinalDay(SIP_DAY)} of the month`,
      reason: `Raises your equity SIP to the level the ${investTarget.shortLabel} goal needs. Step up again in April.`,
    });
  }

  if (prepayAmount > 0 && loanCommitment?.loan) {
    const rate = pctPrecise(loanCommitment.loan.interestRate);
    const projection = projectLoan(loanCommitment, prepayAmount);
    const saved = projection?.monthsSaved ?? 0;
    actions.push({
      kind: 'prepay',
      stepLabel: stepLabel(++step, 'PREPAY'),
      amount: prepayAmount,
      title: 'Car loan principal',
      detailTitle: 'Car loan prepayment',
      caption: `${rate} · principal only`,
      reason: `At ${rate} this beats any debt fund you hold.${
        saved > 0 ? ` Clears the loan ${saved} months early.` : ''
      }`,
    });
  }

  if (parkAmount > 0) {
    const cover = coverMonths(user);
    actions.push({
      kind: 'park',
      stepLabel: stepLabel(++step, 'PARK'),
      amount: parkAmount,
      title: 'Liquid fund',
      detailTitle: 'Liquid fund',
      caption: 'Emergency cover top-up',
      reason: `Emergency cover sits at ${cover.toFixed(1)} months. ${
        targetCoverMonths(user)
      } is the target before more equity.`,
    });
  }

  const scheduledFor = dayOfNextMonth(user.period.start, EXECUTION_DAY);

  return {
    investable,
    buffer,
    actions,
    scheduledFor,
    footerNote: `Approve once and Corpus schedules all ${actions.length === 3 ? 'three' : actions.length} for ${dayMonth(scheduledFor)}.`,
    twelveMonthOutlook: outlook(user, currentScore, projectedScore, prepayAmount),
    projectedScore,
  };
}

function stepLabel(step: number, kind: string): string {
  return `${String(step).padStart(2, '0')} · ${kind}`;
}

/**
 * The monthly top-up that lands the emergency fund on its target date.
 *
 * The expected bonus is earmarked to the fund while it is short, so only the
 * remainder has to come out of monthly surplus. A safety margin is added so a
 * single missed month does not slip the date, and the result is rounded up to
 * an amount the user can set up as a standing instruction.
 */
function emergencyTopUp(user: UserInput): number {
  const goal = user.goals.find((g) => g.id === 'emergency');
  if (!goal) return 0;

  const gap = goal.target - goal.current;
  if (gap <= 0) return 0;

  const months = Math.max(1, monthsBetween(user.period.start, goal.targetDate));
  const fromBonus = Math.min(gap, user.income.expectedAnnualBonus);
  const fromSurplus = Math.max(0, gap - fromBonus);

  const monthly = (fromSurplus / months) * EMERGENCY_SAFETY_MARGIN;
  return Math.ceil(monthly / PLAN_ROUNDING) * PLAN_ROUNDING;
}

export function coverMonths(user: UserInput): number {
  const goal = user.goals.find((g) => g.id === 'emergency');
  if (!goal || user.essentialMonthlyOutgo === 0) return 0;
  return goal.current / user.essentialMonthlyOutgo;
}

function targetCoverMonths(user: UserInput): string {
  const goal = user.goals.find((g) => g.id === 'emergency');
  if (!goal || user.essentialMonthlyOutgo === 0) return 'Six';
  const months = Math.round(goal.target / user.essentialMonthlyOutgo);
  const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  return words[months] ?? String(months);
}

/** "Corpus score moves 78 to 86. The retirement goal returns to on-track. The car loan closes in Apr 2029." */
function outlook(user: UserInput, currentScore: number, projectedScore: number, prepayAmount: number): string {
  const sentences = [`Corpus score moves ${currentScore} to ${projectedScore}.`];

  const behind = behindGoals(user);
  if (behind.length === 1 && behind[0]) {
    sentences.push(`The ${behind[0].shortLabel} goal returns to on-track.`);
  } else if (behind.length > 1) {
    sentences.push(`${behind.length} goals return to on-track.`);
  }

  const loanCommitment = prepaymentTarget(user.commitments);
  if (loanCommitment && prepayAmount > 0) {
    const projection = projectLoan(loanCommitment, prepayAmount);
    if (projection && Number.isFinite(projection.acceleratedMonths)) {
      const closes = addMonths(user.period.start, projection.acceleratedMonths);
      sentences.push(`The car loan closes in ${monthYear(closes)}.`);
    }
  }

  return sentences.join(' ');
}

function ordinalDay(day: number): string {
  const rem100 = day % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "₹38,000 investable · ₹14,400 held back as buffer" */
export function planHeaderNote(plan: MonthlyPlan): string {
  return `${inr(plan.investable)} investable · ${inr(plan.buffer)} held back as buffer`;
}
