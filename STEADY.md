# Steady

Catch burnout before it becomes a resignation letter.

A work-first companion for professionals in high-pressure roles: three
questions a day that turn into an honest signal, a first step when a task has
you frozen, ninety seconds of quiet when your mind goes blank, and a way to
reach a human before a crisis or a resignation.

Built to the scope on the pitch deck's **MVP** slide — every "must have", plus
the wins log, the therapist directory and the weekly insight from "should
have". Nothing from "later", and nothing from "won't do".

## Layout

```
packages/steady-core    the model: burnout signal, Unfreezer, reset, crisis routing
apps/steady-web         Next.js — the server, the database, SSO, and the web app
apps/steady-mobile      Expo / React Native — the Android app
```

Both clients render the same model output. The model runs server-side and
neither client scores anything itself, so the band on your phone can never
disagree with the band in your browser — they came out of one model run.

```
CheckIn[] ──► buildSignal ──► Signal ──┬──► apps/steady-web    (server component)
              (steady-core)            └──► apps/steady-mobile (GET /api/home)
```

## Running it

```bash
npm install

# The web app — http://localhost:3100
npm run dev:steady-web

# The Android app, in Expo
npm run dev:steady-mobile
```

The web app works on a fresh clone with **no configuration at all**: SQLite
creates itself, and anonymous sign-up needs no OAuth credentials. The only
thing worth setting is `AUTH_SECRET`.

```bash
cd apps/steady-web
cp .env.example .env.local
# then put a value in AUTH_SECRET:
openssl rand -base64 32
```

Want data to look at rather than an empty app?

```bash
npm run db:seed -w @steady/web     # four weeks of the deck's primary persona
STEADY_DEMO=1 npm run dev -w @steady/web
```

`STEADY_DEMO=1` adds a one-click sign-in to the seeded account. It is opt-in
rather than dev-only on purpose: a one-click sign-in to a known account is a
back door if it ever ships by accident.

## Checks

```bash
npm run test:steady    # 47 model tests
npm run typecheck      # every workspace

# Against a running server
npm run build:steady && npm start -w @steady/web
npm run e2e:steady                    # 38 API, auth and isolation checks
npm run e2e:pairing -w @steady/web    # 15 checks on the account merge
npm run screens -w @steady/web        # 40 UI checks, writes screenshots/
```

All of it runs against whichever database `DATABASE_URL` points at, so the
same commands verify a SQLite dev box and a Postgres deployment.

The mobile app has its own browser-driven check — see
`apps/steady-mobile/README.md`.

## Login and SSO

Three ways in, in the order the sign-in screen lists them:

1. **Anonymously.** No email, no name, nothing linked to an employer. This is
   the big button, not a "continue as guest" link in grey at the bottom. The
   deck's research is the reason: 39% of people held back from seeking help by
   stigma, and the primary persona downloads this *specifically* because nobody
   at work will know. Putting Google first would ask, on the very first screen,
   for the one thing the product promised not to need.
2. **Google.**
3. **GitHub.**

A provider with no credentials in the environment is not registered and its
button does not render, so the app runs with anonymous sign-up alone until you
add keys.

```bash
AUTH_GOOGLE_ID=...       # redirect URI: <origin>/api/auth/callback/google
AUTH_GOOGLE_SECRET=...
AUTH_GITHUB_ID=...       # callback URL: <origin>/api/auth/callback/github
AUTH_GITHUB_SECRET=...
```

Sessions are JWTs; users and linked identities live in the database. That split
is what lets the Credentials-based anonymous provider coexist with real OAuth.

**The Android app does not do OAuth.** It signs itself up anonymously on first
launch, and a six-digit pairing code from the web app moves it onto a real
account later. Google sign-in inside a React Native app means a custom URL
scheme and a redirect URI per build variant, all of which has to be correct in
the APK before anyone can test anything; six digits needs none of it, and it
degrades honestly — if pairing breaks, the phone keeps working anonymously
rather than locking someone out.

## The database

Prisma. **SQLite by default**, so a fresh clone runs with nothing to install.
**Postgres for anything deployed — and the switch is automatic:**

```bash
DATABASE_URL="postgresql://…" npm run build:steady
npm run db:push -w @steady/web        # once, against the new database
```

Prisma cannot take its `provider` from an environment variable, so the line in
`schema.prisma` has to change. Leaving that as a manual step is a trap with a
long fuse — deploy with a Postgres URL, forget the step, and `prisma generate`
quietly emits a *SQLite* client: the build goes green, the container starts,
and the first query fails in production with an error that does not mention
the real cause. So `scripts/db-provider.mjs` derives the provider from
`DATABASE_URL` on every build, and the deploy cannot drift from the database
it is pointed at. Force it either way with `npm run db:provider -w @steady/web
-- postgresql`.

That works because the schema is portable by construction: no Prisma enums
(SQLite has none), no database-specific native types, and every "enum" is a
`String` whose allowed values live in the TypeScript union it maps to. CI runs
the API and auth suite against a real Postgres as well as SQLite, so a change
that quietly only works on one of them fails there rather than on a deploy.

Two privacy decisions are visible in the schema itself, because a promise kept
only in a policy document is not kept:

- **There is no `organisationId` on `CheckIn`.** The B2B dashboard is out of MVP
  scope; when it arrives it reads aggregates over groups of ten or more. Keeping
  the column absent makes the wrong query hard to write by accident.
- **`CrisisRouting` records that a routing happened and where, never what was
  typed.** The audit answers "did we route correctly", which does not require
  keeping the sentence someone wrote on their worst day.

`DELETE /api/account` removes everything and cascades. Under the DPDP Act 2023,
which the deck commits to, erasure is a right rather than a courtesy.

## Deploying

Any Node host. Vercel, Fly, Railway and a plain container all work.

```bash
DATABASE_URL="postgresql://…"      # the build follows this; nothing else to set
AUTH_SECRET="…"                    # openssl rand -base64 32
AUTH_URL="https://steady.example.com"
STEADY_ALLOWED_ORIGINS="…"         # only if a browser client is on another origin
```

`npm run build:steady` then `npm start -w @steady/web`. Run
`npm run db:push -w @steady/web` once against the production database. The
build picks up the Postgres provider from `DATABASE_URL` on its own — there is
no separate switch step to forget.

Do **not** set `STEADY_DEMO` in production.

## The Android APK

`.github/workflows/steady-android.yml` builds an installable APK and attaches
it to the run.

1. Actions → **Steady Android APK** → *Run workflow*
2. Set **api_base_url** to a server the phone can actually reach — an `https://`
   origin, or `http://<your-LAN-ip>:3100` for a dev server. `localhost` is the
   phone itself.
3. Download the artifact, `adb install -r steady*.apk`.

It builds in CI rather than locally because the Android Gradle Plugin is
published only to Google's Maven repository, and GitHub's runners have the
Android SDK preinstalled.

The APK is signed with the debug keystore `expo prebuild` generates: no secrets
needed, installs on any device, and cannot be mistaken for something ready for
the Play Store. See `apps/steady-mobile/README.md` for the real-keystore path.

## Two things that are deliberately not finished

**The signal's weights are a placeholder pending clinical review.** The three
dimensions are the WHO's (ICD-11: exhaustion, mental distance from one's job,
reduced professional efficacy) and that part is not a guess. The exact weights,
the band cut-points, and reading a three-item daily pulse as equivalent to a
full instrument are **not** yet defensible, and must not be described to a user
or an employer as validated. `packages/steady-core/src/model/constants.ts` says
so at length, and is the one file that has to be replaced when a clinical
advisor lands. The Maslach Burnout Inventory is deliberately unused: it is
licensed, and the deck commits to a freely usable instrument (CBI, OLBI or the
Burnout Assessment Tool).

**The therapist directory is placeholder data.** The names in
`packages/steady-core/src/data/care.ts` are invented, they are flagged as such
in the UI, and shipping them to a real user would be presenting fictional
clinicians as vetted ones. Real partners need verified registrations, a written
referral agreement, and the commission disclosed on the booking screen.

The crisis line is the exception: Tele-MANAS 14416 is real, public, and
hardcoded rather than configured — a crisis number that can be switched off by
a missing environment variable is one that will one day be missing.

## What the deck asked for, and where it is

| Deck | Where |
|---|---|
| Pulse check-in, three WHO dimensions | `steady-core/model/signal.ts`, `/pulse` |
| Weekly green / amber / red signal | `buildSignal`, `/today` |
| Task Unfreezer: 3 steps, 2 questions, 10 min | `model/unfreezer.ts`, `/unfreeze` |
| Blank-mind reset: 90s, in 4 / out 6, offline | `model/reset.ts`, `/reset` |
| Crisis routing to Tele-MANAS 14416 | `model/safety.ts`, every free-text route |
| Anonymous sign-up | `lib/auth.ts`, `POST /api/device` |
| Wins log | `/week` |
| Therapist directory (3–5 partners) | `data/care.ts`, `/care` |
| Weekly insight | `model/insight.ts`, `/week` |
| Employers see nothing individual | schema, `/profile` |
| No guilt-driven streaks | no streak exists; a test asserts it |
| Never diagnoses | `NOT_A_DIAGNOSIS`, asserted in tests |

Not built, because the deck puts them in "later": the ramp-up plan, the
decision room, the B2B team pulse, Slack and calendar integrations, and Hindi
and regional languages.
