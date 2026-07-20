"use client";

import { FormEvent, useState } from "react";
import { ShortlistMap } from "@/components/ShortlistMap";
import { listings } from "@/data/listings";
import { priorityKeys, type MatchResponse, type PriorityKey, type PriorityWeights } from "@/lib/domain";
import { rankListings } from "@/lib/rank";

const starter =
  "I want a bright 3-bedroom in 20878 under $800k. Keep my commute to DC under 1 hour. Pretty community, convenient to groceries and restaurants, with easy access to schools.";

const refinementStarter = "Commute matters less now, but outdoor space is required.";

const factorLabels: Record<PriorityKey, string> = {
  affordability: "Affordability",
  commute: "Commute",
  space: "Space",
  outdoorSpace: "Outdoor",
  naturalLight: "Light",
  communityAppeal: "Community",
  convenience: "Convenience",
  schoolAccess: "Schools",
};

const factorMarks: Record<PriorityKey, string> = {
  affordability: "$",
  commute: "→",
  space: "□",
  outdoorSpace: "✦",
  naturalLight: "☀",
  communityAppeal: "◆",
  convenience: "◎",
  schoolAccess: "A+",
};

const strategyPresets: { label: string; weights: PriorityWeights }[] = [
  {
    label: "Value first",
    weights: { affordability: 100, commute: 25, space: 25, outdoorSpace: 15, naturalLight: 20, communityAppeal: 15, convenience: 20, schoolAccess: 15 },
  },
  {
    label: "More room",
    weights: { affordability: 20, commute: 15, space: 100, outdoorSpace: 55, naturalLight: 25, communityAppeal: 20, convenience: 15, schoolAccess: 15 },
  },
  {
    label: "Easy everyday",
    weights: { affordability: 25, commute: 90, space: 20, outdoorSpace: 15, naturalLight: 20, communityAppeal: 30, convenience: 100, schoolAccess: 25 },
  },
  {
    label: "School access",
    weights: { affordability: 25, commute: 30, space: 20, outdoorSpace: 20, naturalLight: 15, communityAppeal: 20, convenience: 35, schoolAccess: 100 },
  },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Home() {
  const [request, setRequest] = useState(starter);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refinement, setRefinement] = useState(refinementStarter);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState("");
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>({});
  const [weightStatus, setWeightStatus] = useState("");
  const [draftWeights, setDraftWeights] = useState<PriorityWeights | null>(null);

  async function findHomes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to rank homes.");
      setResult(payload);
      setDraftWeights(payload.preferences.priorities);
      setPreviousRanks({});
      setWeightStatus("");
      setRefinement(refinementStarter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to rank homes.");
    } finally {
      setLoading(false);
    }
  }

  async function refineMatches(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;

    setRefining(true);
    setRefineError("");

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUp: refinement,
          currentPreferences: result.preferences,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to refine this shortlist.");

      setPreviousRanks(
        Object.fromEntries(result.matches.map((home, index) => [home.id, index + 1])),
      );
      setResult(payload);
      setDraftWeights(payload.preferences.priorities);
      setWeightStatus("");
      setRefinement("");
    } catch (caught) {
      setRefineError(caught instanceof Error ? caught.message : "Unable to refine this shortlist.");
    } finally {
      setRefining(false);
    }
  }

  function movementFor(homeId: string, currentRank: number) {
    if (Object.keys(previousRanks).length === 0) return null;
    const previousRank = previousRanks[homeId];
    if (!previousRank) return { label: "New match", tone: "new" };
    if (previousRank > currentRank) return { label: `Up ${previousRank - currentRank}`, tone: "up" };
    if (previousRank < currentRank) return { label: `Down ${currentRank - previousRank}`, tone: "down" };
    return { label: "No change", tone: "same" };
  }

  function adjustPriority(key: PriorityKey, weight: number) {
    if (!result) return;
    const nextWeights = {
      ...(draftWeights ?? result.preferences.priorities),
      [key]: weight,
    };
    setDraftWeights(nextWeights);
    setWeightStatus(
      priorityKeys.some((priority) => nextWeights[priority] !== result.preferences.priorities[priority])
        ? "Strategy changes are ready. Recalculate to update every score and rank."
        : "These weights match the currently applied strategy.",
    );
  }

  function applyPreset(label: string, weights: PriorityWeights) {
    setDraftWeights(weights);
    setWeightStatus(`${label} mix is ready. Recalculate to see which homes move.`);
  }

  function recalculateScores() {
    if (!result || !draftWeights) return;

    const preferences = {
      ...result.preferences,
      priorities: draftWeights,
    };

    const previousIds = result.matches.map((home) => home.id);
    const nextMatches = rankListings(listings, preferences);
    const nextIds = nextMatches.map((home) => home.id);
    const newcomers = nextIds.filter((id) => !previousIds.includes(id)).length;
    const orderChanged = nextIds.some((id, index) => id !== previousIds[index]);

    setPreviousRanks(Object.fromEntries(previousIds.map((id, index) => [id, index + 1])));
    setResult({
      ...result,
      preferences,
      matches: nextMatches,
      changes: undefined,
    });
    setWeightStatus(
      newcomers > 0
        ? `${newcomers} new ${newcomers === 1 ? "home entered" : "homes entered"} the top five.`
        : orderChanged
          ? "Scores changed and the same five homes moved into a new order."
          : "Scores changed, but these five still lead because they remain strongest across the full mix.",
    );
  }

  return (
    <main>
      <section className="hero">
        <nav>
          <a className="brand" href="#top" aria-label="GPT Home Buying Agent home">
            <span className="brand-mark">HM</span>
            <span>HomeMatch</span>
          </a>
          <span className="build-week">OpenAI Build Week MVP</span>
        </nav>

        <div className="hero-copy" id="top">
          <div className="chapter-badge"><span>Interactive</span> A smarter way to compare homes</div>
          <h1>Build your strategy for the right home.</h1>
          <p className="lede">
            Turn a life-changing decision into a clear, interactive plan. Build your ideal home
            mix, compare the trade-offs, and tune every priority until the shortlist feels right.
          </p>
        </div>

        <form className="search-card" onSubmit={findHomes}>
          <div className="search-card-heading">
            <div><p>Build your home mix</p><label htmlFor="request">Describe your ideal home</label></div>
            <span className="mix-badge">Start here</span>
          </div>
          <textarea
            id="request"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            rows={4}
            maxLength={1200}
          />
          <div className="form-footer">
            <span>Try budget, ZIP, commute, light, schools, community, or nearby conveniences.</span>
            <button disabled={loading} type="submit">
              {loading ? "Scouting homes..." : "Reveal my shortlist"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      </section>

      {result ? (
        <section className="results" aria-live="polite">
          <div className="results-heading">
            <div>
              <p className="eyebrow">Your match board</p>
              <h2>{result.matches.length ? `${result.matches.length} contenders cleared every hard rule` : "No contenders cleared the rules"}</h2>
            </div>
            <span className={`mode ${result.mode === "gpt-5.6" ? "live" : "demo"}`}>
              {result.mode === "gpt-5.6" ? "Interpreted by GPT-5.6" : "Local demo mode"}
            </span>
          </div>

          {result.warning && <p className="notice">{result.warning}</p>}

          <section className="refinement-panel" aria-labelledby="refinement-title">
            <div className="refinement-copy">
              <div>
                <p className="card-kicker">Refine your strategy</p>
                <h3 id="refinement-title">What did the first round teach you?</h3>
                <p>
                  Your agent keeps the current profile, updates only what you say, and shows how
                  the ranking responds.
                </p>
              </div>
            </div>
            <form className="refinement-form" onSubmit={refineMatches}>
              <label htmlFor="refinement">Add one new preference or trade-off</label>
              <textarea
                id="refinement"
                value={refinement}
                onChange={(event) => setRefinement(event.target.value)}
                rows={2}
                maxLength={800}
                placeholder="For example: Commute matters less, but a yard is required."
              />
              <div className="refinement-actions">
                <div className="quick-refinements" aria-label="Example refinements">
                  <button
                    className="quick-refinement"
                    type="button"
                    onClick={() => setRefinement("Commute matters less now, but outdoor space is required.")}
                  >
                    Prioritize outdoor space
                  </button>
                  <button
                    className="quick-refinement"
                    type="button"
                    onClick={() => setRefinement("Lower my maximum budget to $750k.")}
                  >
                    Lower budget
                  </button>
                </div>
                <button className="refine-submit" disabled={refining || refinement.trim().length < 4} type="submit">
                  {refining ? "Updating..." : "Update shortlist"}
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
              {refineError && <p className="error" role="alert">{refineError}</p>}
            </form>
          </section>

          {result.changes && (
            <div className="change-summary" role="status">
              <div>
                <p className="card-kicker">Strategy updated</p>
                <h3>{result.changes.length ? "Only these stats changed" : "No strategy stats changed"}</h3>
              </div>
              {result.changes.length ? (
                <div className="change-list">
                  {result.changes.map((change) => (
                    <div className="change-chip" key={change.field}>
                      <span>{change.label}</span>
                      <strong>{change.before} <b aria-hidden="true">&rarr;</b> {change.after}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Try a concrete change such as a new budget, commute limit, or must-have.</p>
              )}
            </div>
          )}

          <div className="result-grid">
            <aside className="preference-card">
              <div className="strategy-title"><div><p className="card-kicker">Strategy deck</p><h3>Tune your stats</h3></div><span>{priorityKeys.length} stats</span></div>
              <dl className="constraints">
                <div><dt>ZIP</dt><dd>{result.preferences.zipCode}</dd></div>
                <div><dt>Budget</dt><dd>{money.format(result.preferences.maxPrice)}</dd></div>
                <div><dt>Bedrooms</dt><dd>{result.preferences.minBedrooms}+</dd></div>
                <div><dt>Commute to DC</dt><dd>&le; {result.preferences.maxCommuteMinutes} min</dd></div>
              </dl>
              <div className="priority-list">
                <div className="priority-heading">
                  <p>Priority weights</p>
                  <small>Adjust, then recalculate</small>
                </div>
                <div className="strategy-presets" aria-label="Quick strategy mixes">
                  {strategyPresets.map((preset) => (
                    <button
                      className="preset-button"
                      type="button"
                      key={preset.label}
                      onClick={() => applyPreset(preset.label, preset.weights)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {priorityKeys.map((key) => (
                  <label className="priority" key={key} htmlFor={`priority-${key}`}>
                    <span className="stat-label"><i aria-hidden="true">{factorMarks[key]}</i>{factorLabels[key]}</span>
                    <input
                      id={`priority-${key}`}
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={(draftWeights ?? result.preferences.priorities)[key]}
                      onChange={(event) => adjustPriority(key, Number(event.target.value))}
                    />
                    <output htmlFor={`priority-${key}`}>{(draftWeights ?? result.preferences.priorities)[key]}</output>
                  </label>
                ))}
                <button
                  className="recalculate-button"
                  type="button"
                  disabled={
                    !draftWeights ||
                    !priorityKeys.some(
                      (key) => draftWeights[key] !== result.preferences.priorities[key],
                    )
                  }
                  onClick={recalculateScores}
                >
                  Recalculate scores <span aria-hidden="true">↻</span>
                </button>
                <p className="weight-status" aria-live="polite">{weightStatus}</p>
              </div>
              {result.preferences.assumptions.length > 0 && (
                <div className="assumptions">
                  <p>Assumptions</p>
                  <ul>{result.preferences.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
              <small>Listing facts were checked against the linked Zillow pages on July 20, 2026. Commute, monthly cost, and ranking-factor values are app estimates.</small>
            </aside>

            <div className="matches">
              <ShortlistMap matches={result.matches} />
              {result.matches.length === 0 ? (
                <div className="empty-state">
                  <h3>Your constraints filtered every home in this snapshot.</h3>
                  <p>Raise the budget or extend the commute to see more homes in this dated 20878 snapshot.</p>
                </div>
              ) : result.matches.map((home, index) => {
                const movement = movementFor(home.id, index + 1);
                return (
                <article className="home-card" key={home.id} id={`match-${home.id}`}>
                  <div className="rank-block">
                    <span>Rank #{index + 1}</span>
                    <strong>{home.score}</strong>
                    <small>fit pts</small>
                    {movement && <em className={`movement ${movement.tone}`}>{movement.label}</em>}
                  </div>
                  <div className="home-body">
                    <div className="home-title">
                      <div>
                        <p>{home.style}</p>
                        <h3>{home.address}</h3>
                        <span>{home.city}, {home.state} {home.zipCode}</span>
                      </div>
                      <div className="home-actions">
                        <strong className="price">{money.format(home.price)}</strong>
                        <a
                          className="zillow-link"
                          href={home.zillowUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open the source listing on Zillow"
                        >
                          View on Zillow <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    </div>
                    <p className="description">{home.description}</p>
                    <div className="facts">
                      <span className="listing-status"><strong>{home.listingStatus}</strong></span>
                      <span><strong>{home.bedrooms}</strong> beds</span>
                      <span><strong>{home.bathrooms}</strong> baths</span>
                      <span><strong>{home.squareFeet.toLocaleString()}</strong> sq ft</span>
                      <span><strong>{money.format(home.monthlyCost)}</strong>/mo est.</span>
                    </div>
                    <div className="reason-grid">
                      <div className="strength">
                        <span>Strong advantage</span>
                        <p>{home.strengths[0]}</p>
                      </div>
                      <div className="tradeoff">
                        <span>Watch-out</span>
                        <p>{home.compromises[0]}</p>
                      </div>
                    </div>
                    <details>
                      <summary>See transparent score breakdown</summary>
                      <div className="score-grid">
                        {Object.entries(home.scoreBreakdown).map(([key, score]) => (
                          <div key={key}>
                            <span>{factorLabels[key as PriorityKey]}</span>
                            <strong>{score}</strong>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section className="promise-strip">
          <div><strong aria-hidden="true">♥</strong><span><b>Share your taste</b><small>Describe what matters</small></span></div>
          <div><strong aria-hidden="true">≋</strong><span><b>Compare clearly</b><small>See every score and trade-off</small></span></div>
          <div><strong aria-hidden="true">↻</strong><span><b>Mix it your way</b><small>Tune priorities and watch homes move</small></span></div>
        </section>
      )}
    </main>
  );
}
