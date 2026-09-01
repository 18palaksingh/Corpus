# @corpus/core

The shared heart of Corpus: domain types, design tokens, INR formatting, and the
planning model. Consumed by both `@corpus/web` and `@corpus/mobile`.

## The model

`buildSnapshot(user)` is the one entry point. It is a pure function of the
user's data — same input, same snapshot — and it runs **server-side only**. Both
clients receive a `Snapshot` and render it; neither does financial math of its
own.

```
UserInput ──► buildSnapshot ──► Snapshot ──► web / mobile
```

Inside, the pipeline is:

| Module | Responsibility |
|---|---|
| `cashflow.ts` | Income, commitments, variable spend, surplus |
| `score.ts` | The Corpus score and its twelve-month projection |
| `goals.ts` | Progress, on-track status, captions |
| `plan.ts` | The buffer, the investable pool and the three actions |
| `loans.ts` | Amortisation: what is worth prepaying, and what that buys |
| `portfolio.ts` | Allocation drift, target weights, holding actions |
| `limits.ts` | Per-category limits and the reclaimable total |
| `alerts.ts` | "Needs your attention" |
| `spend.ts` | Merchant and card guidance, profile, sync summary |

## The score is a black box

`constants.ts` holds the pillar weights and thresholds. They are deliberately
**not exported** from the package: the product shows a score, a plan and a
one-line reason, and never a factor breakdown. A test asserts the score summary
does not leak one.

If you are adding a "how we calculated this" view, check with the product team
first — that is a product decision, not an oversight.

## Tests

```
npm test -w @corpus/core
```

The suite pins the model to the figures the design was drawn against. A failure
means either the model or the reference persona changed — work out which before
updating the expectation.
