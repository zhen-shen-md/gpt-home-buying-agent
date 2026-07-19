# GPT Home Buying Agent — two-day implementation plan

## Product promise

A buyer describes an ideal home in ordinary language, sees how those preferences were interpreted, and receives a transparent ranked shortlist that changes when the request changes.

## Vertical slice built first

1. Accept one natural-language buyer request.
2. Use GPT-5.6 Structured Outputs to extract a validated preference object.
3. Fall back to a local parser when an API key is unavailable so the demo remains runnable.
4. Apply hard constraints and deterministic weighted scoring to curated listings.
5. Render the interpreted preferences and top five matches with strengths, compromises, and score breakdowns.
6. Preserve the profile across a follow-up, audit explicit changes, and show ranking movement.

This slice proves the core product loop without MLS access, authentication, saved searches, maps, or autonomous external actions.

## Day 1 — complete the trustworthy ranking loop

- Define listing, preference, and ranked-match contracts.
- Seed realistic listings for two ZIP codes.
- Implement and test deterministic filtering and scoring.
- Integrate GPT-5.6 preference extraction through the Responses API.
- Build the single-page request and ranked-result experience.
- Add explicit labels for AI-extracted values and local-demo fallback behavior.

Exit condition: a fresh request produces a visible, reproducible top-five ranking.

## Day 2 — harden and prepare the submission

- Add conversational refinement while preserving the prior preference state. **Completed.**
- Add selection and side-by-side comparison for up to three homes.
- Improve empty, loading, API-error, and impossible-constraint states.
- Add representative preference-extraction fixtures and ranking tests.
- Deploy, test from a clean browser, and prepare the README/demo script.
- Record where Codex and GPT-5.6 affected implementation decisions.

Exit condition: a judge can run or open the app, complete the primary flow in under two minutes, and understand why every result ranked where it did.

## Must-have after this slice

- Up-to-three-home comparison.
- A larger curated dataset with clear provenance.
- Deployment and submission-ready documentation.

## Completed high-impact increment

- Added a dedicated `/api/refine` route with a full preference-snapshot contract.
- Added GPT-5.6 Structured Output refinement with a deterministic local fallback.
- Preserved unrelated constraints and removed resolved assumptions.
- Added deterministic before/after change detection and visible ranking movement.
- Added tests for profile preservation, hard-constraint refinement, and reranking.

## Stretch goals

- Live property-data and commute APIs.
- Persistent buyer profiles and saved shortlists.
- New-listing and price-change alerts.
- Map view, image analysis, disclosures, showing questions, and mortgage scenarios.
- Human-approved outreach to a licensed real-estate professional.

## Guardrails

- Never rank or recommend using protected characteristics or demographic proxies.
- Treat affordability estimates as planning aids, not lending advice.
- Keep ranking math deterministic and inspectable; use the model for language understanding, not hidden scoring.
- Do not contact agents, schedule showings, or create offers without explicit user approval.
