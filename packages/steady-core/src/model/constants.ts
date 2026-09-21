/**
 * The numbers behind the burnout signal.
 *
 * ## Read this before changing anything in here
 *
 * These weights and thresholds are a **placeholder pending clinical review**,
 * and the pitch deck says so in two places: "use a freely usable, validated
 * burnout instrument, reviewed by clinicians" (Responsibility) and "which
 * scoring method will clinical advisors endorse?" (Open questions).
 *
 * What is defensible today:
 *   - The three dimensions are the WHO's (ICD-11): exhaustion, mental distance
 *     from one's job, reduced professional efficacy. That part is not a guess.
 *   - Exhaustion carries the most weight, which is how the freely usable
 *     instruments (CBI, OLBI, the Burnout Assessment Tool) treat it.
 *
 * What is not yet defensible, and must not be described to a user or an
 * employer as validated:
 *   - The exact weights below.
 *   - The band cut-points.
 *   - Reading a three-item daily pulse as equivalent to a full instrument.
 *
 * The Maslach Burnout Inventory is deliberately *not* used: it is licensed,
 * not freely usable, and the deck commits to a freely usable instrument.
 *
 * When a clinical advisor lands, the work is to replace this file — the rest
 * of the model reads these constants and nothing else.
 */

/** Rolling window the signal is computed over. */
export const WINDOW_DAYS = 7;

/**
 * Below this many check-ins in the window, the band is `unknown`.
 *
 * Three is a judgement call in favour of honesty: two bad days in a row is a
 * bad couple of days, and telling someone it is burnout would be both wrong
 * and, given what the product is for, harmful.
 */
export const MIN_CHECK_INS_FOR_BAND = 3;

/**
 * Dimension weights. Must sum to 1.
 */
export const DIMENSION_WEIGHT = {
  exhaustion: 0.45,
  distance: 0.3,
  efficacy: 0.25,
} as const;

/**
 * Band cut-points on the 0–100 internal strain scale.
 *
 * `amber` is the lower bound of amber, `red` the lower bound of red.
 *
 * Calibrated against the weeks a real person actually reports, because a
 * three-item daily scale does not spread people evenly across 0–100 — answers
 * cluster around the middle:
 *
 *   | A week of…                       | strain | band  |
 *   |----------------------------------|--------|-------|
 *   | energised, engaged, effective    |    0   | green |
 *   | good, mild detachment            |   25   | green |
 *   | fine, a bit distant              |   32   | green |
 *   | flat — a 3 on everything         |   50   | amber |
 *   | tired and pulling away           |   58   | amber |
 *   | drained but still engaged        |   61   | amber |
 *   | drained *and* distant            |   69   | red   |
 *   | nothing left                     |  100   | red   |
 *
 * The line that matters is the last amber row against the first red one.
 * Being exhausted is not, on its own, the WHO's picture of burnout —
 * exhaustion *plus* mental distance is. So "drained but still engaged" stays
 * amber and "drained and distant" goes red, which is also what keeps red rare
 * enough to mean something when the app suggests talking to a human.
 */
export const BAND_THRESHOLD = {
  amber: 45,
  red: 67,
} as const;

/**
 * Physical-signal modifiers, in strain points added to the weighted mean.
 *
 * These are capped hard. Sleep and headaches are context, not the diagnosis —
 * a person who sleeps badly but is engaged and effective at work should not be
 * pushed into amber by sleep alone, so the ceiling is well under one band.
 */
export const MODIFIER = {
  /** Mean sleep below this many hours starts adding strain. */
  sleepDebtBelowHours: 6,
  /** Strain per hour of mean sleep below the threshold. */
  sleepDebtPerHour: 3,
  /** Maximum strain from sleep debt. */
  sleepDebtMax: 8,
  /** Strain at 100% of days reporting body pain, scaled linearly. */
  bodyPainAtEveryDay: 6,
  /** Combined ceiling for every modifier together. */
  totalMax: 12,
} as const;

/**
 * Consecutive red days before Steady offers the bridge to humans.
 *
 * The deck's journey uses ten days ("Your signal has been red for 10 days").
 * The crisis line is never gated behind this — it is on every screen of the
 * care surface, always, regardless of band.
 */
export const CARE_BRIDGE_RED_STREAK_DAYS = 10;

/** Minutes on the Unfreezer's timer. The deck specifies ten. */
export const UNFREEZE_TIMER_MINUTES = 10;

/**
 * An energy answer at or below this counts as a "low energy day" in the
 * evidence sentence ("Energy low for 6 of 7 days").
 */
export const LOW_ENERGY_AT_OR_BELOW = 2;
