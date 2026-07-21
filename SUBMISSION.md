# GPT Home Buying Agent — judge testing guide

## Submission links

| Item | Value | Status |
| --- | --- | --- |
| Live production demo | [gpt-home-buying-agent.vercel.app](https://gpt-home-buying-agent.vercel.app) | Verified: HTTP 200 and live GPT-5.6 response |
| Devpost project | [devpost.com/software/gpt-home-buying-agent](https://devpost.com/software/gpt-home-buying-agent) | Draft |
| Source repository | [github.com/zhen-shen-md/gpt-home-buying-agent](https://github.com/zhen-shen-md/gpt-home-buying-agent) | Verified public |
| License | [MIT](./LICENSE) | Ready |
| Demo video | [youtu.be/qkGeUL-Hd1o](https://youtu.be/qkGeUL-Hd1o) | Verified public, 2:59 |
| Codex `/feedback` Session ID | `019f7bdd-a64f-7532-a7cd-06e61ce36d46` | Ready |

The production deployment was verified on July 20, 2026. Its `/api/match` endpoint returned `mode: gpt-5.6`, five matches, and no fallback warning.

## Two-minute testing path

No account or login is required.

1. Open the [live demo](https://gpt-home-buying-agent.vercel.app).
2. Keep the prefilled request and select **Reveal my shortlist**:

   > I want a bright 3-bedroom in 20878 under $800k. Keep my commute to DC under 1 hour. Pretty community, convenient to groceries and restaurants, with easy access to schools.

3. Confirm the results display **Interpreted by GPT-5.6** and review the structured ZIP, budget, bedrooms, commute limit, and priority weights.
4. Try **Value first** and note the shortlist. Then choose **More room** and select **Recalculate scores**. The top five, scores, movement labels, and numbered map markers update together using deterministic TypeScript ranking.
5. Tune any of the eight strategy weights—including objective school access—and expand **See transparent score breakdown** to inspect the recalculated ranking logic.
6. Submit this follow-up in the refinement panel:

   > Commute matters less now, but outdoor space is required.

7. Confirm the before/after audit shows only the explicit changes, homes without outdoor space disappear, and the ranking and map update.

## Expected behavior

- GPT-5.6 handles the initial natural-language extraction and the conversational profile revision through strict Structured Outputs.
- TypeScript handles hard filtering, scoring, change detection, rank ordering, and manual slider adjustments.
- The app returns no more than five eligible homes.
- The map uses approximate coordinates and is intentionally labeled as a demo visualization.
- If the OpenAI API is unavailable, the interface clearly labels the deterministic local fallback rather than presenting it as GPT output.

## Screenshots

### Playful HomeMatch strategy interface

![HomeMatch interface with an interactive preference brief](./public/screenshots/homematch-visual-check.png)

### Explainable ranking and refinement loop

![Ranked shortlist with adjustable weights, map, and refinement controls](./public/screenshots/03-homematch-ranked-results.png)

## Judge notes

- Property facts and exact source links come from a dated July 20, 2026 Zillow snapshot. Availability and price may change; map coordinates, commute times, monthly costs, and ranking-factor ratings remain app estimates.
- The project does not use protected characteristics or demographic proxies in ranking.
- No outreach, showing scheduling, lending decision, or purchase action is performed.
- See [README.md](./README.md) for installation, environment variables, architecture, Codex contributions, exact GPT-5.6 usage, and limitations.

## Final submission checklist

- [x] Public working deployment
- [x] GPT-5.6 production path verified
- [x] Two submission screenshots
- [x] Testing instructions
- [x] MIT license
- [x] Public or judge-accessible source repository URL
- [x] Public YouTube demo video under three minutes with audio
- [x] Codex `/feedback` Session ID
- [x] Replace the Devpost description's unimplemented side-by-side-comparison claim
- [ ] Register for and submit the project to OpenAI Build Week
