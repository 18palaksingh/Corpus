/**
 * The Task Unfreezer.
 *
 * Paste the task you are frozen on; get three first steps, two questions for
 * your manager, and a ten-minute timer.
 *
 * ## Why this is rules and not a model call
 *
 * Three reasons, in order of how much they mattered:
 *
 *   1. **The guardrail.** The deck is explicit: "the Unfreezer only plans
 *      tasks; it never gives medical or legal advice". A templated planner
 *      cannot wander off that boundary. A general model can, and the person
 *      using it is by definition not in a state to catch it.
 *   2. **It works offline and costs nothing per use.** The MVP's whole bet is
 *      daily use; a hook that needs a paid round-trip on every tap is a hook
 *      that gets rate-limited in month two.
 *   3. **It is testable.** "Helped me start my task, 70%+ yes" is a pilot
 *      metric. A deterministic planner is something you can actually iterate
 *      against that number.
 *
 * The seam for a model is `planTask`'s return type, not its internals: swap
 * the implementation behind that signature once the pilot says which task
 * shapes the templates serve badly.
 *
 * ## The one rule the steps obey
 *
 * Step one must be startable in the next ten minutes without asking anyone
 * for anything. That is the entire point — the person is frozen, and a first
 * step that depends on someone else replying is not a first step.
 */

import type { TaskShape, UnfreezePlan } from '../types.js';
import { UNFREEZE_TIMER_MINUTES } from './constants.js';

/**
 * Keywords that identify a task shape, most specific first.
 *
 * Order matters: "review the model" is a review, not an analysis, so `review`
 * is tested before `analysis`.
 */
const SHAPE_KEYWORDS: ReadonlyArray<readonly [TaskShape, readonly string[]]> = [
  ['review', ['review', 'proofread', 'check over', 'qa', 'sign off', 'sign-off', 'feedback on']],
  ['fix', ['fix', 'debug', 'bug', 'broken', 'failing', 'error', 'issue with', 'troubleshoot']],
  ['deck', ['deck', 'slides', 'presentation', 'pitch', 'ppt', 'powerpoint']],
  [
    'analysis',
    [
      'model',
      'irr',
      'analysis',
      'analyse',
      'analyze',
      'forecast',
      'valuation',
      'spreadsheet',
      'numbers',
      'dashboard',
      'metrics',
      'reconcile',
      'budget',
    ],
  ],
  ['research', ['research', 'find out', 'look into', 'benchmark', 'compare', 'landscape', 'survey']],
  [
    'writing',
    ['write', 'draft', 'memo', 'report', 'summary', 'summarise', 'summarize', 'email', 'proposal', 'doc'],
  ],
  ['meeting', ['meeting', 'call', 'sync', 'standup', 'stand-up', 'workshop', 'interview', 'demo']],
  ['admin', ['expenses', 'timesheet', 'invoice', 'form', 'onboarding', 'compliance', 'paperwork']],
];

function detectShape(task: string): TaskShape {
  const haystack = task.toLowerCase();
  for (const [shape, keywords] of SHAPE_KEYWORDS) {
    if (keywords.some((k) => haystack.includes(k))) return shape;
  }
  return 'general';
}

/**
 * A short handle for the task, for use inside step copy.
 *
 * Strips the leading verb and any trailing deadline clause, then truncates on
 * a word boundary. If what is left is too thin to read as a noun phrase, the
 * caller falls back to copy that does not name the task at all — a step that
 * says "draft one page of for the" is worse than one that says "draft one
 * page".
 */
function taskHandle(task: string): string | null {
  let handle = task
    .trim()
    .replace(/^["'“”']+|["'“”']+$/g, '')
    // Leading verb and article: "Build the IRR summary" → "IRR summary".
    .replace(
      /^(please\s+)?(build|create|make|write|draft|prepare|put together|do|finish|complete|update|review|fix|research|analyse|analyze|send)\s+(the|a|an|my|our)?\s*/i,
      '',
    )
    // Trailing deadline clause: "… for the Friday client call" stays, but
    // "… by Friday" and "… due Monday 5pm" go.
    .replace(/\s+(by|due|before)\s+[^,]*$/i, '')
    .trim();

  // Short enough to sit inside a sentence without the step becoming a
  // paragraph. Truncation lands on a word boundary and drops a dangling
  // preposition or article, so the result never reads "…the summary of…".
  if (handle.length > 38) {
    handle = handle.slice(0, 38).replace(/\s+\S*$/, '');

    // Strip dangling function words repeatedly, not once: truncating "…for
    // Fund III for the Friday call" leaves "for the", and removing only the
    // last of those still reads "IRR summary for Fund III for…".
    let previous: string;
    do {
      previous = handle;
      handle = handle.replace(/\s+(of|for|the|a|an|and|in|on|to|with|across|from|at|by)$/i, '');
    } while (handle !== previous);

    handle = `${handle}…`;
  }

  return handle.length >= 4 ? handle : null;
}

/** Steps and questions per shape. `{t}` is replaced with the task handle. */
const TEMPLATES: Record<TaskShape, { steps: string[]; questions: string[] }> = {
  analysis: {
    steps: [
      "Find last quarter's version and open it as a template",
      'List the inputs you need, and mark the ones you do not have yet',
      'Build one rough sheet with placeholder numbers — wrong is fine, empty is not',
    ],
    questions: [
      'Is there a past example of this I can follow?',
      'Which definition should I use — and who is the audience for the output?',
    ],
  },
  writing: {
    steps: [
      'Write the three bullets you want the reader to walk away with',
      'Find one previous piece with roughly the right shape and structure',
      'Draft one page against those bullets, rough is fine',
    ],
    questions: [
      'Who is reading this, and what do you want them to do after they read it?',
      'Is there a version of this from last time I should follow?',
    ],
  },
  deck: {
    steps: [
      'Write the one sentence the deck has to land, before opening any slide software',
      'Sketch the slide titles as a list — titles only, no content',
      'Fill in the single slide you already know the answer to',
    ],
    questions: [
      'How long is the slot, and who is in the room?',
      'Is there a house template or a recent deck I should match?',
    ],
  },
  review: {
    steps: [
      'Skim it once end to end without commenting, just to see the shape',
      'Note the three things that matter most — structure, not typos',
      'Write those three up and send them, before the detailed pass',
    ],
    questions: [
      'What kind of review do you want — a sanity check or a line-by-line?',
      'When do you need it back, and is anything already known to be rough?',
    ],
  },
  research: {
    steps: [
      'Write the one question this research has to answer',
      'List three sources you would trust, and open the first one',
      'Take notes for fifteen minutes, then stop and see what you have',
    ],
    questions: [
      'What decision is this research feeding into?',
      'How deep should this go — a quick read or a proper piece of work?',
    ],
  },
  fix: {
    steps: [
      'Write down exactly what you expected and what happened instead',
      'Find the smallest case that still shows the problem',
      'Change one thing and check whether the case still fails',
    ],
    questions: [
      'How urgent is this, and is anyone blocked on it right now?',
      'Has this happened before, and is there a known cause?',
    ],
  },
  meeting: {
    steps: [
      'Write the outcome you want by the end of the meeting, in one line',
      'List the three points you need to get through',
      'Send the agenda to the invite, even if it is two lines',
    ],
    questions: [
      'What would make this meeting a good use of the time for you?',
      'Is there anything I should have read or prepared beforehand?',
    ],
  },
  admin: {
    steps: [
      'Open the form and read it once without filling anything in',
      'Gather the two or three documents it is going to ask for',
      'Fill in everything you already know and leave the rest blank',
    ],
    questions: [
      'Is there a deadline on this, or is it a when-you-get-to-it?',
      'Who should I ask if a field does not apply to me?',
    ],
  },
  general: {
    steps: [
      'Write down what "done" looks like, in one sentence',
      'Break it into the first three things that would have to happen',
      'Do the smallest of those three now — ten minutes, no more',
    ],
    questions: [
      'What does a good version of this look like to you?',
      'Is there an example from before that I can work from?',
    ],
  },
};

/**
 * The longest a step may be before it stops being something a frozen person
 * can read in one go. Past this, the generic step is genuinely more useful
 * than a personalised one they have to parse.
 */
const MAX_STEP_LENGTH = 110;

/**
 * Weave the task handle into the first step where it reads naturally.
 *
 * Only the first step gets the handle. Repeating the task in all three reads
 * like filler, and the person can see their own task at the top of the screen.
 *
 * Falls back to the generic step whenever the personalised one would run long.
 */
function personalise(steps: string[], shape: TaskShape, handle: string | null): string[] {
  const first = steps[0] as string;
  if (handle === null) return [...steps];

  const withHandle: Partial<Record<TaskShape, string>> = {
    analysis: `Find last quarter's ${handle} and open it as a template`,
    writing: `Write the three bullets you want the reader of ${handle} to walk away with`,
    deck: `Write the one sentence ${handle} has to land, before opening any slide software`,
    research: `Write the one question ${handle} has to answer`,
    general: `Write down what "done" looks like for ${handle}, in one sentence`,
  };

  const candidate = withHandle[shape];
  const usable = candidate !== undefined && candidate.length <= MAX_STEP_LENGTH;

  return [usable ? candidate : first, ...steps.slice(1)];
}

/**
 * Plan a task.
 *
 * Returns `null` for input too short to plan — the caller shows the empty
 * state rather than three generic steps, because generic advice from a tool
 * that promised to help with *this* task is worse than an honest prompt to
 * paste a bit more.
 *
 * Callers must run `screenForCrisis` on the raw text **before** calling this
 * and route to the crisis surface instead if it trips. Planning a spreadsheet
 * for someone who just disclosed something serious is the single worst thing
 * this product could do.
 */
export function planTask(task: string): UnfreezePlan | null {
  const trimmed = task.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 8) return null;

  const shape = detectShape(trimmed);
  const template = TEMPLATES[shape];
  const handle = taskHandle(trimmed);

  return {
    task: trimmed,
    shape,
    steps: personalise(template.steps, shape, handle),
    managerQuestions: [...template.questions],
    timerMinutes: UNFREEZE_TIMER_MINUTES,
  };
}
