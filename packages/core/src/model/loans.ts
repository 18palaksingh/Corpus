import type { CommitmentInput } from '../types.js';
import { DEBT_YIELD_THRESHOLD } from './constants.js';

/**
 * Loan amortisation.
 *
 * Used for two things: ranking which loan is worth prepaying, and projecting
 * when a loan closes if the plan's prepayment is sustained.
 */

/** Months to clear `principal` paying `payment` a month at `annualRate`. */
export function monthsToClear(principal: number, payment: number, annualRate: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return Math.ceil(principal / payment);

  const interestOnly = principal * r;
  // A payment at or below the monthly interest never clears the loan.
  if (payment <= interestOnly) return Number.POSITIVE_INFINITY;

  const n = -Math.log(1 - (principal * r) / payment) / Math.log(1 + r);
  return Math.ceil(n - 1e-9);
}

/**
 * The loan the plan should prepay: the highest rate above the threshold at
 * which prepaying beats holding the money in debt funds. Below that threshold
 * the money is better invested, so nothing is returned.
 */
export function prepaymentTarget(commitments: CommitmentInput[]): CommitmentInput | undefined {
  return commitments
    .filter((c) => c.loan && c.loan.interestRate > DEBT_YIELD_THRESHOLD)
    .sort((a, b) => b.loan!.interestRate - a.loan!.interestRate)[0];
}

export interface LoanProjection {
  /** Months to close with no prepayment. */
  baselineMonths: number;
  /** Months to close with the prepayment sustained. */
  acceleratedMonths: number;
  monthsSaved: number;
}

/**
 * What the prepayment buys, assuming it continues for as long as the loan's
 * rate keeps beating the debt-fund yield — which, at a fixed rate, is the whole
 * remaining term.
 */
export function projectLoan(commitment: CommitmentInput, extraPerMonth: number): LoanProjection | undefined {
  const loan = commitment.loan;
  if (!loan) return undefined;

  const baselineMonths = monthsToClear(loan.outstandingPrincipal, commitment.monthlyAmount, loan.interestRate);
  const acceleratedMonths = monthsToClear(
    loan.outstandingPrincipal,
    commitment.monthlyAmount + extraPerMonth,
    loan.interestRate,
  );

  return {
    baselineMonths,
    acceleratedMonths,
    monthsSaved: Math.max(0, baselineMonths - acceleratedMonths),
  };
}
