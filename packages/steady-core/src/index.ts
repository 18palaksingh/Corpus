/**
 * @steady/core — the whole model, in one place.
 *
 * Both clients import from here and neither one computes anything itself. The
 * band on the home screen and the band in the weekly insight come out of the
 * same model run, so they cannot disagree.
 *
 * Deliberately not exported: `model/constants.ts`. The weights and cut-points
 * behind the signal are a placeholder pending clinical review, and a client
 * that could read them would sooner or later render them — turning a band
 * into a number, and a number into something people treat as a diagnosis.
 */

export * from './types.js';
export * from './tokens.js';

export {
  buildSignal,
  careOffered,
  energySeries,
} from './model/signal.js';

export { buildWeeklyInsight } from './model/insight.js';
export { planTask } from './model/unfreezer.js';
export { buildResetScript, RESET_PATTERN_LABEL, RESET_EXIT_LABEL } from './model/reset.js';

export {
  screenForCrisis,
  CRISIS_COPY,
  NOT_A_DIAGNOSIS,
  TELE_MANAS,
} from './model/safety.js';

export {
  CARE_OPTIONS,
  CARE_PARTNERS,
  CARE_INTRO,
  CARE_COMMISSION_DISCLOSURE,
  CARE_PARTNERS_ARE_PLACEHOLDERS,
} from './data/care.js';

export {
  addDays,
  assertDay,
  daysBetween,
  daysEndingAt,
  toDay,
  weekdayName,
} from './model/dates.js';

/**
 * Check-in questions, in the order the three-step pulse asks them.
 *
 * Here rather than in each client so the wording — which is the actual
 * instrument, such as it is — cannot drift between web and Android.
 */
export const PULSE_QUESTIONS = {
  energy: {
    question: "How's your energy today?",
    low: 'Drained',
    high: 'Energised',
  },
  detachment: {
    question: 'Felt distant from your work?',
    low: 'Not at all',
    high: 'Completely',
  },
  effectiveness: {
    question: 'Felt on top of what you had to do?',
    low: 'Not at all',
    high: 'Completely',
  },
  sleepHours: { question: 'Hours of sleep last night' },
  bodyPain: { question: 'Any headaches or body pain?' },
  workedLate: { question: 'Did work eat your evening?' },
} as const;

/** The promise under the check-in. It is load-bearing — see the deck's wedge. */
export const PRIVACY_LINE = 'Your answers stay private. Only you see them.';
