# Devpost submission copy — GPT Home Buying Agent

## Name

GPT Home Buying Agent

## Tagline

An AI agent that turns home preferences into transparent, adaptable property rankings.

## Built with

GPT-5.6, OpenAI Responses API, Codex, Next.js, React, TypeScript, Zod, and Vitest.

## Description

GPT Home Buying Agent helps buyers turn a nuanced wish list into an inspectable shortlist. A buyer describes an ideal home in natural language, reviews the structured constraints and priorities extracted by GPT-5.6, and receives up to five ranked matches from a dated snapshot of real 20878 properties.

Hard constraints—ZIP code, budget, bedrooms, commute limit, and required outdoor space—are applied before a deterministic TypeScript scoring engine ranks eligible homes. Every result shows its fit score, estimated monthly cost, strongest advantage, main trade-off, complete factor breakdown, approximate map position, listing status, and direct Zillow source link.

The HomeMatch interface makes refinement playful without trivializing the decision. Buyers can adjust eight weights, try Value first, More room, Easy everyday, or School access strategy mixes, and then recalculate the shortlist. The interface reports whether a new home entered the top five, the same homes reordered, or the leaders remained unchanged. A conversational follow-up such as “Commute matters less now, but outdoor space is required” updates only the stated preferences, displays a before/after audit, and reranks the homes.

GPT-5.6 is used server-side for two bounded language-understanding tasks: initial preference extraction and stateful preference refinement. Both use strict Zod-backed Structured Outputs. GPT-5.6 does not invent listings, apply filters, calculate scores, or choose the final order.

The app uses a July 20, 2026 snapshot of eight real properties with direct Zillow detail links. It is not a live listing feed. Commute times, monthly costs, approximate coordinates, community appeal, convenience, and school-access values are explicitly labeled app estimates. School access means proximity/convenience only; the app does not score school quality, rankings, test results, student demographics, protected characteristics, or demographic proxies.

## Links

- Live demo: https://gpt-home-buying-agent.vercel.app
- Repository: https://github.com/zhen-shen-md/gpt-home-buying-agent
- License: MIT
- Codex `/feedback` Session ID: `019f7bdd-a64f-7532-a7cd-06e61ce36d46`

## Judge testing path

1. Open the live demo and submit the prefilled 20878 request.
2. Review the GPT-5.6 interpretation and the five explainable matches.
3. Apply the Value first preset, recalculate, then apply More room and recalculate again.
4. Expand a transparent score breakdown and open a direct Zillow source link.
5. Submit “Commute matters less now, but outdoor space is required.”
6. Review the preference-change audit and updated ranking.

## Known limitations

- The property dataset is a dated snapshot, not a licensed live feed.
- Map coordinates, commute, monthly costs, and qualitative factors are estimates.
- Side-by-side comparison, accounts, saved searches, alerts, and showing coordination are not implemented.
- Buyers should independently verify listing availability, financial estimates, school boundaries, and travel times.
