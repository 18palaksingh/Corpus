/**
 * Crisis screening and routing.
 *
 * The deck sets one guardrail metric at 100%: "crisis messages routed
 * correctly". This file is that guardrail, so it is written to a different
 * standard from the rest of the model.
 *
 * ## The trade-off, stated plainly
 *
 * This screen is deliberately over-sensitive. Routing someone to a helpline
 * they did not need costs them a moment of friction and a screen they can
 * dismiss. Missing someone who did need it costs something that cannot be
 * undone. So every ambiguity resolves towards showing the helpline, and there
 * is no negation handling — "I'm not going to kill myself" still routes,
 * because a regex that reasons about negation is a regex that can be argued
 * into silence by a sentence it parsed wrong.
 *
 * ## What this is not
 *
 * It is not a risk assessment and it is not a triage tool. It decides one
 * thing: whether this screen shows the crisis line prominently instead of
 * carrying on with the product. A clinical advisor should own the phrase list
 * before Steady is in front of real users at any scale — see the deck's
 * Responsibility slide.
 */

import type { CrisisResource, SafetyScreen } from '../types.js';

/**
 * India's national mental health helpline, free and 24×7.
 *
 * Hardcoded rather than configured: a crisis number that can be switched off
 * by a missing environment variable is a crisis number that will one day be
 * missing. The deck names this line specifically.
 */
export const TELE_MANAS: CrisisResource = {
  name: 'Tele-MANAS',
  phone: '14416',
  detail: 'Free, 24×7, in 20+ Indian languages',
};

/**
 * Phrases that route to the crisis line.
 *
 * Matched case-insensitively against the text with punctuation flattened to
 * spaces, so "kill myself." and "kill  myself" both hit. Kept as phrases
 * rather than single words on purpose: "suicide" alone would fire on "that
 * deadline is career suicide", which trains people to ignore the screen — and
 * a warning people have learned to dismiss protects nobody.
 */
const CRISIS_PHRASES: readonly string[] = [
  'kill myself',
  'killing myself',
  'end my life',
  'ending my life',
  'take my own life',
  'taking my own life',
  'end it all',
  'want to die',
  'wish i was dead',
  'wish i were dead',
  'better off dead',
  'better off without me',
  'no reason to live',
  'nothing to live for',
  "don't want to live",
  'do not want to live',
  'dont want to live',
  'suicidal',
  'suicide attempt',
  'attempt suicide',
  'attempted suicide',
  'commit suicide',
  'thinking about suicide',
  'thoughts of suicide',
  'hurt myself',
  'hurting myself',
  'harm myself',
  'harming myself',
  'self harm',
  'self-harm',
  'cut myself',
  'cutting myself',
  'overdose',
  'jump off',
  'jump in front of',
  "can't go on",
  'cannot go on',
  'cant go on',
  "can't take it anymore",
  'cannot take it anymore',
  'cant take it anymore',
  'want it to stop',
  'make it stop forever',
];

/**
 * Flatten text for matching: lowercase, punctuation to spaces, runs of
 * whitespace collapsed. Leading and trailing spaces are kept so that a phrase
 * list entry can be matched without word-boundary regex gymnastics.
 */
function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9']+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

/**
 * Screen free text — a pasted task, a reflection, anything a person types —
 * for a crisis disclosure.
 *
 * Returns the matched phrase so the routing can be audited against the 100%
 * guardrail. The phrase is never shown to the person: reflecting their own
 * words back at them in a warning banner is not care.
 */
export function screenForCrisis(text: string): SafetyScreen {
  const haystack = normalise(text);

  for (const phrase of CRISIS_PHRASES) {
    if (haystack.includes(` ${normalise(phrase).trim()} `)) {
      return { crisis: true, matched: phrase };
    }
  }

  return { crisis: false, matched: null };
}

/**
 * The copy shown when a screen trips.
 *
 * Written to be read by someone with very little capacity: short sentences,
 * no questions back, no "are you sure", and the number before anything else.
 * It does not ask them to check in, and it does not offer the Unfreezer —
 * a person in crisis does not need help starting a spreadsheet.
 */
export const CRISIS_COPY = {
  heading: 'Talk to someone now',
  body:
    'It sounds like you are going through something heavy. You do not have to handle it alone, and you do not have to explain it to anyone at work.',
  action: `Call ${TELE_MANAS.name} ${TELE_MANAS.phone}`,
  detail: TELE_MANAS.detail,
  /** Shown under the number, so the app never pretends to be the help. */
  disclaimer: 'Steady is not a crisis service and cannot see this message.',
} as const;

/**
 * The standing disclaimer, shown wherever Steady says anything about how
 * someone is doing. The deck's "won't do" list is explicit: no diagnosing, no
 * replacing therapy.
 */
export const NOT_A_DIAGNOSIS =
  'Steady notices patterns in what you tell it. It is not a diagnosis and not a substitute for a professional.';
