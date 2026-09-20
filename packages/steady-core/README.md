# @steady/core

The model. Types, design tokens, and every judgement Steady makes.

Both clients import from here and neither computes anything itself, so the band
on the home screen and the numbers in the weekly insight cannot disagree —
they come out of one model run.

```
model/signal.ts      check-ins → green / amber / red, one fact, one next action
model/insight.ts     the week: energy delta, a pattern (or honestly none), an experiment
model/unfreezer.ts   a pasted task → three first steps and two manager questions
model/reset.ts       the 90-second breathing and grounding script
model/safety.ts      crisis screening and routing to Tele-MANAS
model/constants.ts   the weights and thresholds — NOT exported, read the header
data/care.ts         the therapist directory — placeholder data, read the header
tokens.ts            the palette, sampled from the pitch deck
```

## Three rules the code exists to enforce

**It is a signal, not a diagnosis.** Nothing here returns a clinical label. The
internal 0–100 `strain` is stripped before it reaches a client, in exactly one
place (`apps/steady-web/lib/queries.ts`), and `constants.ts` is deliberately
not exported from the package — a client that could read the weights would
sooner or later render them, turning a band into a number and a number into
something people treat as a result.

**Silence beats a guess.** Under three check-ins in the window the band is
`unknown` and the app says so. Three bad days is a bad three days, and calling
it burnout would be both wrong and, given what this product is for, harmful.
The weekly insight follows the same rule: `pattern` is `null` unless the data
actually supports one, because "your hardest days were Monday and Thursday" is
an observation when it is true and a horoscope when it is not.

**One next action, never a wall of content.** A person reading these screens
has no spare attention.

## The signal, calibrated

Answers on a three-item daily scale cluster around the middle, so the band
cut-points are set against the weeks a real person reports rather than against
an even spread of 0–100:

| A week of… | strain | band |
|---|---|---|
| energised, engaged, effective | 0 | green |
| fine, a bit distant | 32 | green |
| flat — a 3 on everything | 50 | amber |
| drained but still engaged | 61 | amber |
| drained *and* distant | 69 | red |
| nothing left | 100 | red |

The line that matters is the last amber row against the first red one. Being
exhausted is not, on its own, the WHO's picture of burnout — exhaustion *plus*
mental distance is. That is what keeps "drained but coping" out of red, and
what keeps red rare enough to mean something when the app suggests talking to
a human.

Sleep debt and body pain are capped modifiers, not dimensions. Someone who
sleeps badly but is engaged and effective at work stays green, and a test
asserts it.

## The crisis screen is held to a different standard

The deck sets one guardrail at 100%: crisis messages routed correctly. So
`model/safety.ts` is deliberately over-sensitive, and deliberately does no
negation handling — "I'm not going to kill myself" still routes, because a
regex that reasons about negation is one that can be argued into silence by a
sentence it parsed wrong.

It matches phrases rather than single words: `suicide` alone would fire on
"that deadline is career suicide", and a warning people have learned to dismiss
protects nobody. Both halves are tested.

Callers must screen **before** planning. `POST /api/unfreeze` does, and returns
the crisis surface with no plan attached — handing someone three steps for a
spreadsheet thirty seconds after a disclosure is the worst thing this product
could do, and the only way to be sure it cannot happen is for the planner never
to run.

## Why the Unfreezer is rules, not a model call

1. **The guardrail.** The deck is explicit that the Unfreezer only plans tasks
   and never gives medical or legal advice. A templated planner cannot wander
   off that boundary; a general model can, and the person using it is by
   definition not in a state to catch it.
2. **It works offline and costs nothing per use.** The whole bet is daily use.
3. **It is testable.** "Helped me start my task, 70%+ yes" is a pilot metric,
   and a deterministic planner is something you can iterate against a number.

The seam for a model is `planTask`'s signature, not its internals. Swap the
implementation once the pilot says which task shapes the templates serve badly.

One rule the steps always obey: **step one must be startable in the next ten
minutes without asking anyone for anything.** The person is frozen; a first
step that waits on someone else's reply is not a first step. A test asserts it.

## Two things deliberately unfinished

`model/constants.ts` — the weights and cut-points are a placeholder pending
clinical review. The three dimensions are the WHO's and that is not a guess;
the exact numbers are. Read the header before changing anything in it.

`data/care.ts` — the therapist names are invented, flagged as placeholders in
the UI, and must be replaced with real partners before anyone outside the team
sees that screen.

## Tests

```bash
npm run test -w @steady/core     # 45 tests
```

They protect, in descending order of how much a regression would cost: crisis
routing, the band never claiming more than the data supports, and the copy
never leaking the score's internals or reading as a diagnosis.
