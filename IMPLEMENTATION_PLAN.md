# GPT Home Buying Agent — two-day MVP implementation record

## Product promise

A buyer describes an ideal home in ordinary language, reviews how the request was interpreted, and receives a transparent shortlist that can be reshaped without restarting the search.

## Smallest working vertical slice

1. Accept one natural-language buyer request.
2. Use GPT-5.6 Structured Outputs to extract a validated preference profile.
3. Fall back to a clearly labeled local parser when the API is unavailable.
4. Apply hard constraints before deterministic weighted scoring.
5. Show up to five ranked homes with strengths, compromises, monthly-cost estimates, source links, and complete score breakdowns.
6. Preserve the profile across a follow-up, audit explicit changes, and show rank movement.

## Day 1 — trustworthy ranking loop

- [x] Define listing, preference, and ranked-match TypeScript contracts.
- [x] Build and test deterministic hard filtering and weighted scoring.
- [x] Integrate GPT-5.6 preference extraction through the Responses API.
- [x] Add a credential-free local fallback for demo resilience.
- [x] Render an inspectable preference profile and top-five ranking.
- [x] Seed a dated snapshot of eight real 20878 properties with direct Zillow source links.

Exit condition achieved: a fresh request produces a visible, reproducible ranking whose inputs and math can be inspected.

## Day 2 — refinement, interaction, and submission readiness

- [x] Add conversational refinement while preserving unrelated preferences.
- [x] Display a before/after preference audit and rank-movement labels.
- [x] Add adjustable weights, an explicit recalculation action, and four strategy presets.
- [x] Add school access as an objective proximity/convenience factor with explicit fair-housing guardrails.
- [x] Add a synchronized schematic map for the five visible matches.
- [x] Add real Zillow detail links and visibly separate sourced facts from app estimates.
- [x] Redesign the interface as playful HomeMatch strategy tuning without numbered quest framing.
- [x] Deploy to Vercel and prepare the README, judge guide, screenshots, license, and Devpost copy.

Exit condition achieved: a judge can complete the core flow in under two minutes and understand why each result moved.

## Intentionally deferred

- Side-by-side comparison and saved shortlists.
- A licensed live MLS or brokerage feed.
- Live routing, geocoding, mortgage scenarios, and listing photography.
- Persistent accounts, alerts, and buyer profiles.
- Showing coordination or human-approved agent outreach.

## Guardrails

- Never rank or recommend using protected characteristics or demographic proxies.
- Treat school-related language only as access or proximity—not quality, rankings, test scores, or student demographics.
- Treat affordability and commute values as planning estimates, not lending or routing advice.
- Keep filtering and ranking deterministic and inspectable; use GPT-5.6 for language understanding, not hidden scoring.
- Do not contact agents, schedule showings, or create offers without explicit user approval.
