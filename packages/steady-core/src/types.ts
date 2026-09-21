/**
 * Steady domain types.
 *
 * Two halves, same as the rest of the codebase:
 *   - `*Input` types are what a person types or taps.
 *   - Everything else is model output, computed server-side and sent to the
 *     client ready to render. Neither client scores anything itself, so the
 *     band on the home screen can never disagree with the band in the weekly
 *     insight — they came out of one model run.
 */

import type { SignalBand } from './tokens.js';

export type { SignalBand };

// ---------------------------------------------------------------------------
// The pulse check-in
// ---------------------------------------------------------------------------

/** A 1–5 Likert answer. The UI never shows the number, only the end labels. */
export type Scale = 1 | 2 | 3 | 4 | 5;

/**
 * One day's check-in.
 *
 * The first three fields are the WHO's three burnout dimensions (ICD-11:
 * exhaustion, mental distance from one's job, reduced professional efficacy).
 * The rest are the physical signals the deck's research called out — they are
 * context for the weekly insight, and they nudge the band, but they are not
 * one of the three dimensions.
 */
export interface CheckInInput {
  /** 1 drained … 5 energised. Inverse of the exhaustion dimension. */
  energy: Scale;
  /** 1 fully engaged … 5 completely distant. The mental-distance dimension. */
  detachment: Scale;
  /** 1 ineffective … 5 on top of it. Inverse of the efficacy dimension. */
  effectiveness: Scale;
  /** Hours slept last night, 0–14. */
  sleepHours: number;
  /** Headaches or body pain today. */
  bodyPain: boolean;
  /** Finished work late enough that it ate the evening. */
  workedLate: boolean;
}

export interface CheckIn extends CheckInInput {
  /** Local calendar day, `YYYY-MM-DD`. One check-in per person per day. */
  date: string;
  /** When it was recorded, ISO 8601. */
  recordedAt: string;
}

// ---------------------------------------------------------------------------
// The signal
// ---------------------------------------------------------------------------

/**
 * The burnout signal over a rolling window.
 *
 * This is a *signal*, never a score and never a diagnosis. The product shows
 * the band, one sentence of evidence and one next action — it does not show a
 * number out of a hundred, because a number invites people to treat it as a
 * clinical result. `strain` exists for the model and the tests; the API strips
 * it before it reaches a client.
 */
export interface Signal {
  band: SignalBand;
  /** 0–100, internal. Higher is more strain. Not for display. */
  strain: number;
  /** How many days in the window had a check-in. */
  checkInCount: number;
  /** Length of the window in days. */
  windowDays: number;
  /**
   * Consecutive days, counting back from the most recent check-in, whose
   * running band was red. Drives the bridge-to-humans offer.
   */
  redStreakDays: number;
  /**
   * One plain sentence naming what drove the band — "Energy low for 6 of
   * 7 days". Empty when the band is `unknown`.
   */
  evidence: string;
  /** The single next action offered on the home screen. */
  suggestion: Suggestion;
  /** True once there are enough check-ins for the band to mean anything. */
  confident: boolean;
}

export type SuggestionKind = 'check-in' | 'reset' | 'unfreeze' | 'insight' | 'care';

export interface Suggestion {
  kind: SuggestionKind;
  /** Button copy, e.g. "90-sec blank-mind reset". */
  label: string;
  /** One line of why, shown under the label. Never guilt-driven. */
  reason: string;
}

// ---------------------------------------------------------------------------
// The weekly insight
// ---------------------------------------------------------------------------

export interface WeeklyInsight {
  /** Inclusive `YYYY-MM-DD` bounds of the week being reported. */
  from: string;
  to: string;
  /** Mean energy this week vs the week before, as a signed percentage. */
  energyDeltaPercent: number | null;
  checkInCount: number;
  windowDays: number;
  /**
   * The pattern worth naming, or null when the data does not support one.
   * Never invented: if two weekdays are not meaningfully worse than the rest,
   * this stays null rather than manufacturing an observation.
   */
  pattern: string | null;
  /** Wins the person logged this week, most recent first. */
  wins: string[];
  /** One small, specific experiment for next week. */
  experiment: string;
}

// ---------------------------------------------------------------------------
// The Task Unfreezer
// ---------------------------------------------------------------------------

/**
 * The shape of task the planner recognised. Used to pick a template and,
 * later, to measure which kinds of task the Unfreezer actually helps with.
 */
export type TaskShape =
  | 'analysis'
  | 'writing'
  | 'deck'
  | 'review'
  | 'research'
  | 'fix'
  | 'meeting'
  | 'admin'
  | 'general';

export interface UnfreezePlan {
  /** Echo of what the person pasted, trimmed. */
  task: string;
  shape: TaskShape;
  /** Exactly three. The first one is always small enough to start now. */
  steps: string[];
  /** Two questions to send a manager. Empty only if the task is unreadable. */
  managerQuestions: string[];
  /** Minutes on the timer the UI offers. */
  timerMinutes: number;
}

// ---------------------------------------------------------------------------
// The blank-mind reset
// ---------------------------------------------------------------------------

export interface ResetStep {
  /** What the screen says. */
  text: string;
  /** Seconds this step holds. */
  seconds: number;
  /** Breathing steps drive the counter ring; grounding steps do not. */
  kind: 'breathe-in' | 'breathe-out' | 'ground';
}

export interface ResetScript {
  steps: ResetStep[];
  totalSeconds: number;
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

/**
 * The result of screening free text for a crisis disclosure.
 *
 * Steady is not a clinical product, so this screen is deliberately blunt and
 * deliberately over-sensitive: routing someone to a helpline they did not need
 * costs a moment of friction, and missing someone who did costs far more.
 */
export interface SafetyScreen {
  crisis: boolean;
  /** The matched phrase, for tests and for the routing audit log. Never shown. */
  matched: string | null;
}

export interface CrisisResource {
  name: string;
  /** Dialable, digits only where the UI needs a `tel:` href. */
  phone: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// The bridge to humans
// ---------------------------------------------------------------------------

export type CareKind = 'therapist' | 'doctor' | 'peer';

export interface CareOption {
  kind: CareKind;
  title: string;
  detail: string;
}

export interface CarePartner {
  name: string;
  credential: string;
  focus: string;
  /** Rupees for a first session. The deck promises a low-cost first session. */
  firstSessionInr: number;
  languages: string[];
  modes: Array<'video' | 'in-person'>;
}

// ---------------------------------------------------------------------------
// What the clients render
// ---------------------------------------------------------------------------

/**
 * Everything the home screen needs, in one model run.
 *
 * Both clients GET this. If a field is not here, no screen shows it.
 */
export interface HomeSnapshot {
  /** Display name, or null for an anonymous account — the UI greets without one. */
  displayName: string | null;
  /** Local calendar day the server computed this for. */
  today: string;
  /** True when the person has not checked in today; drives the primary CTA. */
  checkInDueToday: boolean;
  signal: Omit<Signal, 'strain'>;
  /** Last 7 days of energy, oldest first. Null for days with no check-in. */
  energySeries: Array<number | null>;
  /** Offered once the red streak crosses the bridge threshold. */
  careOffered: boolean;
  recentWins: string[];
}
