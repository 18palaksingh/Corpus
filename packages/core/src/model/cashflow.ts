import type { CashflowSummary, UserInput } from '../types.js';

/**
 * Monthly cashflow.
 *
 * Variable spend is the tracked categories plus untracked spend, minus any
 * category already counted as a fixed commitment — rent appears in both places
 * (as a commitment, and in the limits table so the user sees a ceiling for it)
 * and must not be double-counted.
 */
export function computeCashflow(user: UserInput): CashflowSummary {
  const { income, commitments, period } = user;

  const totalIncome = income.monthlyTakeHome + income.rentalIncome + income.freelanceAndOther;
  const fixedCommitments = commitments.reduce((sum, c) => sum + c.monthlyAmount, 0);

  const trackedVariable = period.categories
    .filter((c) => !c.inCommitments)
    .reduce((sum, c) => sum + c.spent, 0);
  const variableSpend = trackedVariable + period.otherVariableSpend;

  const surplus = totalIncome - fixedCommitments - variableSpend;

  return {
    totalIncome,
    fixedCommitments,
    variableSpend,
    surplus,
    surplusVsAverage: surplus - period.sixMonthAverageSurplus,
  };
}

/** Total scheduled EMI across every commitment that services a loan. */
export function totalEmi(user: UserInput): number {
  return user.commitments.filter((c) => c.loan).reduce((sum, c) => sum + c.monthlyAmount, 0);
}

/** Blended credit utilisation across every card. */
export function creditUtilisation(user: UserInput): number {
  const limit = user.cards.reduce((sum, c) => sum + c.creditLimit, 0);
  if (limit === 0) return 0;
  return user.cards.reduce((sum, c) => sum + c.outstanding, 0) / limit;
}

/** Emergency cover in months of essential outgo. */
export function emergencyCoverMonths(user: UserInput): number {
  const emergency = user.goals.find((g) => g.id === 'emergency');
  if (!emergency || user.essentialMonthlyOutgo === 0) return 0;
  return emergency.current / user.essentialMonthlyOutgo;
}
