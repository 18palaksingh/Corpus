import type { Snapshot, UserInput } from '../types.js';
import { periodLabel, plural } from '../format.js';
import { computeAlerts } from './alerts.js';
import { computeCashflow } from './cashflow.js';
import { computeGoals } from './goals.js';
import { computeLimits } from './limits.js';
import { computePlan } from './plan.js';
import { computeAllocation, computeHoldings, computePortfolio, monthsToTarget } from './portfolio.js';
import { computeProfile, computeSpendGuidance, computeSync } from './spend.js';
import { computeScore, projectScore } from './score.js';

/**
 * The one entry point.
 *
 * Everything the five screens read comes out of here. It is a pure function of
 * the user's data: same input, same snapshot. Run it server-side and send the
 * result to the client ready to render — the client does no financial math.
 */
export function buildSnapshot(user: UserInput, now: Date = new Date()): Snapshot {
  const cashflow = computeCashflow(user);
  const score = computeScore(user, cashflow);

  // The plan needs the projected score for its twelve-month outlook, and the
  // projection needs the plan's emergency top-up. Resolve the cycle by
  // computing the plan once against the current score, reading the top-up back
  // out, and projecting from that.
  const draft = computePlan(user, cashflow, score.value, score.value);
  const park = draft.actions.find((a) => a.kind === 'park')?.amount ?? 0;
  const projected = projectScore(user, cashflow, park);
  const plan = computePlan(user, cashflow, score.value, projected);

  const equityContribution = plan.actions.find((a) => a.kind === 'invest')?.amount ?? 0;
  const months = monthsToTarget(user, equityContribution);

  return {
    generatedAt: now.toISOString(),
    period: {
      start: user.period.start,
      label: periodLabel(user.period.start),
    },
    user: {
      name: user.name,
      city: user.city,
      dependents: user.dependents,
      subtitle: `${user.city} · ${stabilityWord(user.income.stability)} · ${plural(user.dependents, 'dependent')}`,
    },
    sync: computeSync(user),
    score,
    cashflow,
    portfolio: computePortfolio(user),
    plan,
    alerts: computeAlerts(user),
    goals: computeGoals(user),
    allocation: computeAllocation(user),
    allocationNote: Number.isFinite(months)
      ? `Corpus moves you gradually. Nothing is sold to reach the target; new money does the work over the next ${months} months.`
      : 'Corpus moves you gradually. Nothing is sold to reach the target; new money does the work.',
    holdings: computeHoldings(user),
    limits: computeLimits(user),
    spend: computeSpendGuidance(user),
    profile: computeProfile(user),
  };
}

/** "Salaried, permanent" reads as just "Salaried" in the top bar's subtitle. */
function stabilityWord(stability: UserInput['income']['stability']): string {
  return stability.split(',')[0]!.trim();
}

export { computeCashflow } from './cashflow.js';
export { computeScore, projectScore } from './score.js';
export { computePlan, planHeaderNote } from './plan.js';
export { computeLimits, limitStatus } from './limits.js';
export { computeAlerts } from './alerts.js';
export { computeGoals } from './goals.js';
export { computeAllocation, computeHoldings, computePortfolio } from './portfolio.js';
export { computeSpendGuidance, computeProfile, computeSync } from './spend.js';
