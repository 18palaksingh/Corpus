/**
 * The bridge to humans.
 *
 * ## These partners are placeholders, and must be replaced before launch
 *
 * The names below are invented. They exist so the directory screen can be
 * built, reviewed and demoed against realistic data — nothing more. Shipping
 * them to a real user would be presenting fictional clinicians as vetted ones,
 * which is the opposite of what a "vetted therapists" promise means.
 *
 * Before this screen goes in front of anyone outside the team it needs: real
 * partners with verified registration numbers, a written referral agreement,
 * and the commission arrangement disclosed on this screen (the deck's business
 * model names "transparent commission on therapist bookings" — transparent
 * means the person booking can see it, not just the partner).
 *
 * The crisis line in `model/safety.ts` is the exception: that one is real,
 * public, and hardcoded on purpose.
 */

import type { CareOption, CarePartner } from '../types.js';

/** Marks the directory as demo data for every surface that renders it. */
export const CARE_PARTNERS_ARE_PLACEHOLDERS = true;

/**
 * The three ways out, in the order the deck's prototype lists them.
 *
 * Framing matters here. Each one names what it is for, so the person can
 * self-select without having to decide how bad things are first — "is it bad
 * enough?" is the exact question the research found keeps people away.
 */
export const CARE_OPTIONS: readonly CareOption[] = [
  {
    kind: 'therapist',
    title: 'Talk to a therapist',
    detail: 'Vetted, first session at a low cost',
  },
  {
    kind: 'doctor',
    title: 'See a doctor',
    detail: 'About headaches, sleep and body pain',
  },
  {
    kind: 'peer',
    title: 'Talk to someone like you',
    detail: 'Moderated peer circle, first names only',
  },
];

/** Placeholder directory. See the file header before using any of this. */
export const CARE_PARTNERS: readonly CarePartner[] = [
  {
    name: 'Sample Partner A',
    credential: 'Clinical psychologist · RCI-registered (placeholder)',
    focus: 'Work stress, burnout, early-career transitions',
    firstSessionInr: 500,
    languages: ['English', 'Hindi'],
    modes: ['video'],
  },
  {
    name: 'Sample Partner B',
    credential: 'Counselling psychologist · RCI-registered (placeholder)',
    focus: 'Anxiety, sleep, impostor feelings in new roles',
    firstSessionInr: 600,
    languages: ['English', 'Kannada'],
    modes: ['video', 'in-person'],
  },
  {
    name: 'Sample Partner C',
    credential: 'Psychiatrist · MD (placeholder)',
    focus: 'When physical symptoms and low mood have run for months',
    firstSessionInr: 900,
    languages: ['English', 'Hindi', 'Marathi'],
    modes: ['video', 'in-person'],
  },
];

/**
 * Shown above the directory.
 *
 * Steady does not decide what someone needs — it lowers the cost of finding
 * out. The copy says so, because the alternative reads as triage, and triage
 * from an app that has already promised it is not a diagnosis would be a
 * contradiction the user would be right to notice.
 */
export const CARE_INTRO =
  'You do not have to be in crisis to talk to someone. A first session is often just a conversation about whether this is worth doing.';

/** Disclosure required on every booking surface. */
export const CARE_COMMISSION_DISCLOSURE =
  'Steady earns a commission on bookings made through this screen. It does not change what you pay, and it does not affect who is listed.';
