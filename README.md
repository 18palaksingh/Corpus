# Corpus

> **This repository holds two products.** Corpus is below. **Steady** — a
> work-first companion that helps professionals catch burnout early — lives in
> `packages/steady-core`, `apps/steady-web` and `apps/steady-mobile`, and is
> documented in **[STEADY.md](STEADY.md)**. They share the monorepo and nothing
> else.

## Corpus

A personal finance planner for salaried users in India. Income, fixed
commitments, spending, credit cards and existing investments go in; one monthly
plan comes out — invest this, prepay that, park the rest — alongside
per-category spending limits and merchant, travel and card recommendations.

Five screens, one model, two clients: a desktop-first web app and an iOS/Android
app.

## Layout

```
packages/core     types, design tokens, INR formatting, and the planning model
apps/web          Next.js (App Router) — the desktop-first web app
apps/mobile       Expo / React Native — iOS, Android, and Expo web
```

Steady's three workspaces (`packages/steady-core`, `apps/steady-web`,
`apps/steady-mobile`) sit alongside these and are independent of them.

Both clients render the same `Snapshot`. The model runs server-side and neither
client does financial math of its own, so the score on one screen can never
disagree with the plan on another — they came out of one model run.

```
UserInput ──► buildSnapshot ──► Snapshot ──┬──► apps/web  (server component)
              (packages/core)              └──► apps/mobile (GET /api/snapshot)
```

## Running it

```bash
npm install

# Web — http://localhost:3000
npm run dev:web

# Mobile — press i / a / w in the Expo CLI
npm run dev:mobile
```

The mobile app reads the web app's API. Point it at a running server with
`expo.extra.apiBaseUrl` in `apps/mobile/app.json`; on a physical device that
needs your machine's LAN address, not `localhost`. When the API is unreachable
the app falls back to its last synced snapshot and says so on screen.

For cross-origin clients (Expo web, or a separately-hosted client) set
`CORPUS_ALLOWED_ORIGINS` — see `apps/web/.env.example`.

## Checks

```bash
npm test          # 26 model tests, pinned to the design's figures
npm run typecheck # all three packages

# End-to-end, against a running server
npm run build && npm start -w @corpus/web
npm run e2e -w @corpus/web
```

## Design tokens

Tokens live in `packages/core/src/tokens.ts` because the mobile app needs them
as values. The web app's CSS custom properties are **generated** from that file
(`apps/web/scripts/generate-tokens.mjs`, run before dev and build) rather than
hand-copied, so the two platforms cannot drift. Change a colour there and it
lands on both.

The mono/sans split is a hard rule on both platforms: if it is a number or an
all-caps metadata label, it is mono.

## The score is a black box

The pillar weights and thresholds behind the Corpus score live in
`packages/core/src/model/constants.ts` and are deliberately not exported from
the package. The product shows a number, a four-segment bar and one sentence —
never a factor breakdown. A test asserts the summary does not leak one.

If you are adding a "how we calculated this" view, that is a product decision,
not a missing feature. Check first.

## Decisions the prototype left open

The handoff called these out as needing decisions during implementation.

**Responsive behaviour.** The prototype is fixed-desktop. Two breakpoints:
below 1100px the multi-column grids collapse, the four-column holdings table
becomes a stacked block per holding, and the five-column limits table becomes a
two-line row. Below 760px the sidebar becomes a scrolling top bar. On mobile the
sidebar's five destinations become a bottom tab bar carrying the same ink ground
and accent indicator, and its LAST RUN block moves to the profile screen.

**Loading, empty and error states.** Web renders per request, so there is no
loading flash. Mobile shows a spinner on first load, pull-to-refresh thereafter,
and falls back to the last synced snapshot behind an explicit banner when the
API cannot be reached — a plan the user believes is current when it is not is
worse than no plan.

**Form behaviour.** The profile's income fields are real inputs. They show
Indian-grouped digits when idle and plain digits while focused, because
separators moving under the caret are worse than none. Saves are debounced, so
typing a five-digit salary is one recalculation rather than five. Income
stability and tax regime are selects on web; on mobile they are read-only,
because they change how the whole plan is built and deserve a deliberate
full-screen choice rather than a stray tap.

**The three interactions specified as intent.** Approving the plan goes through
a confirmation listing every action and amount, then switches the card to a
scheduled state. Adjust turns the amounts into inputs that re-split the same
investable pool, with the total constrained — money moved into one action has to
come out of another. Recalculate reruns the model and updates the sidebar's LAST
RUN line, reporting that it is working while it does.

The approval endpoint re-derives the investable pool server-side and rejects
anything that does not reconcile against it, so a tampered or stale client
cannot schedule more than the model allowed.

## Where the numbers come from

Every figure on every screen is either an input in
`packages/core/src/data/persona.ts` or something the model derives from one.
Nothing in the UI is hardcoded. Swap the persona for a real user's data and the
screens follow.

Two figures differ from the prototype, because the prototype's placeholders do
not survive the arithmetic:

| Prototype | This implementation | Why |
|---|---|---|
| Car loan "clears 11 months early", closes Nov 2029 | 18 months early, closes Apr 2029 | ₹9,000 a month against ₹7.67L at 9.4% on an ₹18,600 EMI saves 18 months, not 11. The model amortises it properly (`model/loans.ts`). |
| New money reaches the target allocation "over the next five months" | over the next 18 months | Moving equity from 54% to 62% of an ₹18.4L portfolio on ₹22,000 a month takes 18 months, because the contributions grow the denominator too. |

Both sentences are generated from the computed value, so they stay correct if
the inputs change. If the product team wants the prototype's numbers instead,
the inputs are what should move — not the copy.

**One data-fidelity note.** The prototype's portfolio allocation (54/21/15/10 of
₹18.4L) and its five reviewed holdings cannot both be true: EPF alone, at ₹6.0L,
exceeds the ₹3.86L the 21% debt weight allows. They are modelled as what they
are — an allocation from the portfolio aggregator, and a separate set of
positions the model has an opinion on. Real holdings data would let these be
derived from one source.
