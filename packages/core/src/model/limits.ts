import type { CategoryLimit, LimitsSummary, UserInput } from '../types.js';
import { inr, inrSigned } from '../format.js';

/**
 * Spending limits.
 *
 * Limits are set against take-home, city and goals — they arrive as model
 * output. This module turns them into rows the table can render and totals the
 * reclaimable figure the dashboard and the summary cards both quote.
 */

/**
 * Bar colour bands. Under 96% of the limit is comfortable, 96–100% is worth
 * watching, and over is a real overshoot. The bar is clamped at the limit so an
 * overspend does not draw outside the track — the percentage carries it.
 */
export function limitStatus(usage: number): CategoryLimit['status'] {
  if (usage > 1) return 'over';
  if (usage > 0.95) return 'at';
  return 'under';
}

export function computeLimits(user: UserInput): LimitsSummary {
  const rows: CategoryLimit[] = user.period.categories.map((c) => {
    const usage = c.limit === 0 ? 0 : c.spent / c.limit;
    const status = limitStatus(usage);
    return {
      id: c.id,
      label: c.label,
      spent: c.spent,
      limit: c.limit,
      usage,
      fill: Math.min(1, usage),
      status,
      usageLabel: `${Math.round(usage * 100)}%`,
      note: c.note,
    };
  });

  const withinLimit = rows.filter((r) => r.status !== 'over').length;

  // What returning to every limit, and taking the sourcing changes on the
  // "Where to spend" screen, is worth per month.
  const reclaimablePerMonth = user.period.categories.reduce((sum, c) => sum + c.identifiedSaving, 0);

  const rentCeiling = user.period.categories.find((c) => c.id === 'rent')?.limit ?? 0;
  const travelRemaining = user.annualTravelBudget - user.annualTravelSpent;
  const travelYear = new Date(user.period.start).getUTCFullYear();

  return {
    withinLimit,
    totalCategories: rows.length,
    reclaimablePerMonth,
    rows,
    highlights: [
      {
        label: 'RENT CEILING',
        value: inr(rentCeiling),
        copy: user.guidance.rentCeilingCopy.replace('{city}', user.city),
      },
      {
        label: `TRAVEL BUDGET, ${travelYear}`,
        value: inr(user.annualTravelBudget),
        copy: `${inr(travelRemaining)} unspent. ${user.guidance.travelBudgetCopy}`,
      },
      {
        label: 'IF YOU HIT EVERY LIMIT',
        value: `${inrSigned(reclaimablePerMonth)}/mo`,
        accent: true,
        copy: user.guidance.reclaimableCopy,
      },
    ],
  };
}
