# GPT Home Buying Agent

An OpenAI Build Week MVP that turns conversational home preferences into transparent, adaptable property rankings.

Built with GPT-5.6, Codex, Next.js, React, TypeScript, Zod, and Vitest.

[Live demo](https://gpt-home-buying-agent.vercel.app) · [Judge testing guide](./SUBMISSION.md) · [Devpost project](https://devpost.com/software/gpt-home-buying-agent)

## Screenshots

### Explainable shortlist with adjustable priorities and a synchronized map

![Decision profile with adjustable priority weights beside a ranked shortlist map](./public/screenshots/01-ranked-shortlist.png)

### Conversational refinement with a visible change audit

![Refinement loop showing changed preferences, map movement, and a new top-ranked home](./public/screenshots/02-refinement-loop.png)

## What the project does

GPT Home Buying Agent gives a buyer a simple refinement loop:

1. Describe an ideal home in everyday language.
2. Review the extracted budget, ZIP code, bedroom count, commute limit, and weighted preferences.
3. Explore up to five matching homes with estimated monthly costs, strengths, compromises, a complete score breakdown, and a synchronized shortlist map.
4. Drag any priority-weight slider to rerank the eligible homes immediately.
5. Add a follow-up such as “Commute matters less now, but outdoor space is required.”
6. See exactly which preferences changed and how the shortlist moved.

Hard constraints are applied before a deterministic scoring engine ranks eligible homes across affordability, commute, space, outdoor space, natural light, community appeal, and grocery/restaurant convenience.

## Who it helps and what problem it solves

The MVP is for home buyers who know what they want but struggle to translate a long, nuanced wish list into a manageable shortlist. Property portals expose many filters, but buyers still have to compare trade-offs manually and often cannot see why one home should rank above another.

This project converts conversational preferences into an inspectable decision profile. It makes the compromises behind each result visible and lets buyers change their minds without rebuilding the search from scratch.

## Short usage example

Start with the prefilled request:

> I want a bright 3-bedroom in 20878 under $800k. Keep my commute to DC under 1 hour. Pretty community and convenient to groceries and restaurants.

The app interprets this as:

| Field | Interpreted value |
| --- | --- |
| ZIP code | 20878 |
| Maximum price | $800,000 |
| Minimum bedrooms | 3 |
| Maximum commute to DC | 60 minutes |
| Emphasized qualities | Natural light, community appeal, groceries and restaurants |

Select **Find my matches** to receive five ranked sample homes. In local demo mode, the current fixtures rank `118 Lakelands Drive` first for this request. Then submit a refinement such as:

> Commute matters less now, but outdoor space is required.

The agent preserves the rest of the decision profile, displays a before/after change audit, filters out homes without outdoor space, and reranks the shortlist.

## Prerequisites and installation

Prerequisites:

- Node.js 20 or newer.
- pnpm 9 or newer; npm can also be used.
- An OpenAI API key for live GPT-5.6 interpretation. The credential-free fallback remains usable without one.

From the project directory:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

On PowerShell, use `Copy-Item .env.example .env.local` instead.

## Environment variables

Do not commit secret values. The checked-in `.env.example` contains names and safe defaults only.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | For live GPT-5.6 mode | Server-side OpenAI API credential. If it is absent or the API is unavailable, the app switches to clearly labeled local demo mode. |
| `OPENAI_MODEL` | No | Model used by both language-understanding calls. Defaults to `gpt-5.6`. |

Example without a secret value:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
```

## How to run and test it

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Development uses Turbopack and writes generated files to `.next-dev`. Production builds use `.next`, so running a build cannot corrupt an active development module cache.

Run the automated checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Test a production build locally:

```bash
pnpm build
pnpm start
```

Equivalent npm commands work if npm was used to install dependencies.

## Sample data

The app uses eight curated fictional listings from ZIP code 20878 in Gaithersburg, Maryland. They live in [`data/listings.ts`](./data/listings.ts) and include price, bedrooms, bathrooms, square footage, estimated monthly cost, commute time, outdoor-space availability, and 1–5 ratings for natural light, community appeal, and convenience.

The fixtures include an intentionally over-budget home to demonstrate hard filtering. Addresses, approximate map coordinates, listing details, commute times, quality ratings, and monthly estimates are for product demonstration only; they are not live real-estate data.

## Where Codex accelerated development

Codex helped turn the product concept into a working vertical slice within the Build Week scope. It accelerated:

- Workspace inspection and MVP planning.
- TypeScript contracts for listings, buyer preferences, score breakdowns, and API responses.
- The deterministic filter-and-rank engine and its Vitest coverage.
- Adjustable priority sliders and the synchronized schematic shortlist map.
- GPT-5.6 Structured Output integration and the credential-free fallback parser.
- The stateful refinement endpoint, before/after preference audit, and rank-movement UI.
- Migration of the complete demo from ZIP 07030 to 20878, including the fixtures, one-hour commute parsing, community and convenience factors, UI copy, and tests.
- Repeated typecheck, test, production-build, and API smoke-test verification.

## Important decisions made with Codex

- **Separate language understanding from consequential math.** GPT-5.6 interprets the buyer’s words; deterministic TypeScript applies filters and calculates every ranking score.
- **Filter hard constraints before scoring preferences.** ZIP code, maximum price, minimum bedrooms, commute limit, and required outdoor space cannot be outweighed by softer qualities.
- **Make refinement stateful and auditable.** A follow-up updates a complete preference snapshot, but the interface reports only values that actually changed.
- **Keep the demo resilient.** A labeled local parser supports the core flow when an API key, network access, or model quota is unavailable.
- **Avoid demographic inference.** The model prompts prohibit protected characteristics and demographic proxies. “Community appeal” is a fictional fixture rating for the demo, not a demographic or resident-composition score.
- **Prefer transparent sample data over premature integrations.** Fictional fixtures keep the two-day MVP reproducible while clearly separating the prototype from live listing claims.

## Exactly how and where GPT-5.6 is used

GPT-5.6 is called server-side in [`lib/preferences.ts`](./lib/preferences.ts) through the OpenAI Responses API. Both calls use `client.responses.parse`, low reasoning effort, and strict Zod-backed Structured Outputs through `zodTextFormat`.

### 1. Initial preference extraction

`POST /api/match` in [`app/api/match/route.ts`](./app/api/match/route.ts) passes the buyer’s request to `parsePreferences`. GPT-5.6 returns a validated object containing:

- ZIP code, maximum price, minimum bedrooms, and maximum commute time.
- Whether outdoor space is an explicit hard requirement.
- 0–100 relative weights for affordability, commute, space, outdoor space, natural light, community appeal, and convenience.

Missing scalar constraints remain `null` in the model response and are completed by application defaults with visible assumptions. The system instruction explicitly prohibits inferring protected characteristics or demographic proxies.

### 2. Conversational refinement

`POST /api/refine` in [`app/api/refine/route.ts`](./app/api/refine/route.ts) passes the current structured profile plus the buyer’s follow-up to `refinePreferences`. GPT-5.6 returns a complete revised profile and is instructed to preserve every unrelated value. TypeScript then computes the before/after diff and reranks the listings.

GPT-5.6 is **not** used to invent listings, estimate listing facts at runtime, apply hard filters, calculate scores, or choose the final ordering. Those operations are implemented in [`lib/rank.ts`](./lib/rank.ts), making the result reproducible and inspectable.

If `OPENAI_API_KEY` is missing or either model call fails, the same routes use explicitly labeled local parsing and refinement functions from `lib/preferences.ts`.

## Known limitations

- The dataset contains only eight fictional 20878 listings and is not connected to an MLS or brokerage feed.
- Commute times, monthly costs, community appeal, and convenience scores are static demo values, not verified real-world estimates or financial advice.
- Community appeal is inherently subjective; a production version would need a carefully defined, non-demographic methodology and fair-housing review.
- The local fallback recognizes a narrower range of language than GPT-5.6.
- Results are not saved between browser sessions; there are no accounts, alerts, or persistent buyer profiles.
- The map is a schematic visualization of approximate fictional coordinates; it does not use live street tiles, routing, or geocoding.
- Side-by-side comparison, listing photos, live mortgage scenarios, showing coordination, and agent outreach are not implemented.
- The app does not independently verify model-extracted preferences beyond schema validation, so buyers should review the visible decision profile before relying on the ranking.
- Live GPT-5.6 mode depends on a valid API key, network access, account access, and available API quota.

## Project scope

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the two-day MVP scope, completed refinement increment, guardrails, and proposed next steps.

## License

This project is available under the [MIT License](./LICENSE).
