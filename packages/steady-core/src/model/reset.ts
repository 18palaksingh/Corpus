/**
 * The blank-mind reset.
 *
 * Ninety seconds, one tap, works offline. The deck's prototype specifies the
 * breathing pattern (in for 4, out for 6) and the grounding that follows
 * ("drop your shoulders, then name 3 things you can see").
 *
 * The script is generated rather than hardcoded as a list of strings so the
 * cycle count and the totals cannot drift apart — a "90-second reset" that
 * runs for 108 seconds is a small lie, and this is a product whose entire
 * proposition is that it tells you the truth about how you are doing.
 *
 * Longer exhale than inhale is the one piece of physiology here worth naming:
 * it is the common thread across paced-breathing protocols, and it is why the
 * pattern is 4/6 rather than 4/4. Nothing else in this file claims to be
 * clinical.
 */

import type { ResetScript, ResetStep } from '../types.js';

const INHALE_SECONDS = 4;
const EXHALE_SECONDS = 6;
/** 6 cycles × 10s = 60s of breathing, then 30s of grounding. */
const BREATH_CYCLES = 6;

const GROUNDING: ReadonlyArray<readonly [string, number]> = [
  ['Drop your shoulders', 10],
  ['Name three things you can see', 12],
  ['Unclench your jaw, and let your hands go loose', 8],
];

/**
 * Build the script.
 *
 * The exhale copy changes on the last cycle so the transition into grounding
 * does not arrive as a surprise.
 */
export function buildResetScript(): ResetScript {
  const steps: ResetStep[] = [];

  for (let cycle = 0; cycle < BREATH_CYCLES; cycle += 1) {
    steps.push({
      text: cycle === 0 ? 'Breathe in slowly…' : 'In…',
      seconds: INHALE_SECONDS,
      kind: 'breathe-in',
    });
    steps.push({
      text: cycle === BREATH_CYCLES - 1 ? 'Last one — all the way out' : 'Breathe out slowly…',
      seconds: EXHALE_SECONDS,
      kind: 'breathe-out',
    });
  }

  for (const [text, seconds] of GROUNDING) {
    steps.push({ text, seconds, kind: 'ground' });
  }

  return {
    steps,
    totalSeconds: steps.reduce((sum, s) => sum + s.seconds, 0),
  };
}

/** The pattern, for the line of copy under the timer ring. */
export const RESET_PATTERN_LABEL = `In for ${INHALE_SECONDS}, out for ${EXHALE_SECONDS}`;

/**
 * Copy for the exit.
 *
 * The reset always offers the way back to the work, because the person opened
 * it in the middle of something. "Skip to task" is in the deck's prototype and
 * is available from the first second — a wellbeing exercise you cannot leave
 * is a trap, not a reset.
 */
export const RESET_EXIT_LABEL = 'Skip to task';
