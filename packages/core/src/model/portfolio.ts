import type {
  AllocationRow,
  AssetClass,
  HoldingActionKind,
  HoldingReview,
  PortfolioSummary,
  UserInput,
} from '../types.js';
import { pct } from '../format.js';

const ORDER: AssetClass[] = ['equity', 'debt', 'gold', 'cash'];

const LABEL: Record<AssetClass, string> = {
  equity: 'Equity',
  debt: 'Debt',
  gold: 'Gold',
  cash: 'Cash and liquid',
};

/** Short labels for the stacked bar's legend: "Equity 54%", "Cash 10%". */
const LEGEND_LABEL: Record<AssetClass, string> = {
  equity: 'Equity',
  debt: 'Debt',
  gold: 'Gold',
  cash: 'Cash',
};

export function computePortfolio(user: UserInput): PortfolioSummary {
  return {
    totalValue: user.portfolio.totalValue,
    xirr: user.portfolio.xirr,
    xirrSince: user.portfolio.xirrSince,
    segments: ORDER.map((assetClass) => ({
      assetClass,
      weight: user.portfolio.current[assetClass],
      label: `${LEGEND_LABEL[assetClass]} ${pct(user.portfolio.current[assetClass])}`,
    })),
  };
}

/** Target allocation rows: current weight, target weight, and the shift between them. */
export function computeAllocation(user: UserInput): AllocationRow[] {
  return ORDER.map((assetClass) => {
    const current = user.portfolio.current[assetClass];
    const target = user.portfolio.target[assetClass];
    return {
      assetClass,
      label: LABEL[assetClass],
      current,
      target,
      shiftLabel: `${pct(current)} → ${pct(target)}`,
    };
  });
}

/**
 * How long new money takes to reach the target weights, given the plan's
 * monthly equity contribution. Nothing is sold: the existing positions stay put
 * and fresh contributions dilute the overweight classes.
 *
 * Solving for the month `m` at which the underweighted class reaches its target:
 *   (value + contribution·m) / (total + contribution·m) = target
 */
export function monthsToTarget(user: UserInput, monthlyEquityContribution: number): number {
  const target = user.portfolio.target.equity;
  const total = user.portfolio.totalValue;
  const value = total * user.portfolio.current.equity;

  if (monthlyEquityContribution <= 0) return Number.POSITIVE_INFINITY;
  if (value / total >= target) return 0;

  const denominator = monthlyEquityContribution * (1 - target);
  if (denominator <= 0) return Number.POSITIVE_INFINITY;

  return Math.ceil((target * total - value) / denominator);
}

const ACTION_LABEL: Record<HoldingActionKind, string> = {
  keep: 'Keep',
  'stop-sip': 'Stop SIP',
  hold: "Hold, don't add",
  review: 'Review',
};

/**
 * The "changes to what you already hold" table.
 *
 * The action follows from the flag the holding rules raised: an overlapping
 * fund has its SIP redirected rather than being sold, an overweight class is
 * held but not added to, and a low-return product is put up for review.
 * Positions the monthly plan already acts on are left out — a second, possibly
 * contradictory instruction on the same holding would only confuse.
 */
export function computeHoldings(user: UserInput): HoldingReview[] {
  return user.holdings
    .filter((h) => !h.excludeFromReview)
    .map((h) => {
      const actionKind: HoldingActionKind =
        h.flag === 'overlap' ? 'stop-sip' : h.flag === 'overweight' ? 'hold' : h.flag === 'low-return' ? 'review' : 'keep';

      return {
        id: h.id,
        name: h.name,
        value: h.value,
        action: ACTION_LABEL[actionKind],
        actionKind,
        why: h.why,
      };
    });
}
