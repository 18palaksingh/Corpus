/**
 * Model constants.
 *
 * These are the weights and thresholds behind the Corpus score and the monthly
 * plan. They are deliberately NOT exported from the package's public surface:
 * the product decision is that the algorithm is a black box. The apps receive a
 * score, a plan and a one-line reason — never a factor breakdown.
 *
 * If you are adding a "how we calculated this" view, stop and check with the
 * product team first.
 */

/** Score pillar weights. Must sum to 1. */
export const SCORE_WEIGHTS = {
  savingsRate: 0.22,
  emergencyCover: 0.18,
  goalTrack: 0.2,
  debtLoad: 0.15,
  allocationFit: 0.13,
  creditHealth: 0.12,
} as const;

/** Savings rate that scores full marks. */
export const TARGET_SAVINGS_RATE = 0.25;

/** EMI-to-income ratio at which the debt pillar scores zero. */
export const DEBT_LOAD_CEILING = 0.35;

/** Total allocation drift, in percentage points, at which the fit pillar scores zero. */
export const ALLOCATION_DRIFT_CEILING = 60;

/** Credit utilisation below this is unpenalised; the pillar reaches zero one span above it. */
export const CREDIT_UTILISATION_FLOOR = 0.3;
export const CREDIT_UTILISATION_SPAN = 0.7;

/**
 * Per-card utilisation band the bureau model rewards, with a safety margin so a
 * pending charge does not push the card back over the line before the statement
 * is generated.
 */
export const CARD_BAND_CEILING = 0.6;
export const CARD_BAND_MARGIN = 0.025;

/** Days between a card's statement date and its payment due date. */
export const CARD_GRACE_DAYS = 17;

/**
 * Share of the modelled twelve-month improvement the outlook actually promises.
 * Cohort plan adherence over a full year sits near this; promising the raw
 * modelled gain would systematically overshoot.
 */
export const ADHERENCE_FACTOR = 0.55;

/** Emergency cover, in months of essential outgo, that scores full marks. */
export const EMERGENCY_TARGET_MONTHS = 6;

/**
 * Prepaying a loan only beats holding debt funds above this yield. Below it,
 * the money is better invested.
 */
export const DEBT_YIELD_THRESHOLD = 0.072;

/** Padding on the monthly emergency top-up so one missed month does not slip the date. */
export const EMERGENCY_SAFETY_MARGIN = 1.15;

/** Plan amounts are rounded to a figure a user can actually set up as a mandate. */
export const PLAN_ROUNDING = 500;

/** Day of the following month the approved plan executes. */
export const EXECUTION_DAY = 2;

/** Day of the month SIPs are debited. */
export const SIP_DAY = 3;

/** The score bar has four segments. */
export const SCORE_SEGMENTS = 4;

/** Section 80C annual deduction cap. */
export const SECTION_80C_CAP = 150_000;
