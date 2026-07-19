"use client";

import { FormEvent, useState } from "react";
import { ShortlistMap } from "@/components/ShortlistMap";
import { listings } from "@/data/listings";
import { priorityKeys, type MatchResponse, type PriorityKey } from "@/lib/domain";
import { rankListings } from "@/lib/rank";

const starter =
  "I want a bright 3-bedroom in 20878 under $800k. Keep my commute to DC under 1 hour. Pretty community and convenient to groceries and restaurants.";

const refinementStarter = "Commute matters less now, but outdoor space is required.";

const factorLabels: Record<PriorityKey, string> = {
  affordability: "Affordability",
  commute: "Commute",
  space: "Space",
  outdoorSpace: "Outdoor",
  naturalLight: "Light",
  communityAppeal: "Community",
  convenience: "Convenience",
};

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
    if (!result || result.preferences.priorities[key] === weight) return;

    const preferences = {
      ...result.preferences,
      priorities: {
        ...result.preferences.priorities,
        [key]: weight,
      },
    };

    setPreviousRanks(
      Object.fromEntries(result.matches.map((home, index) => [home.id, index + 1])),
    );
    setResult({
      ...result,
      preferences,
      matches: rankListings(listings, preferences),
      changes: undefined,
    });
    setWeightStatus(`${factorLabels[key]} weight is now ${weight}. The shortlist was reranked.`);
  }

  return (
    <main>
      <section className="hero">
        <nav>
          <a className="brand" href="#top" aria-label="GPT Home Buying Agent home">
            <span className="brand-mark">H</span>
            <span>HomeMatch</span>
          </a>
          <span className="build-week">OpenAI Build Week MVP</span>
        </nav>

        <div className="hero-copy" id="top">
          <p className="eyebrow">A clearer path to the right front door</p>
          <h1>Tell us what home feels like.</h1>
          <p className="lede">
            Your personal buying copilot turns everyday preferences into transparent rankings—so
            every match comes with reasons, trade-offs, and math you can inspect.
          </p>
        </div>

        <form className="search-card" onSubmit={findHomes}>
          <label htmlFor="request">Describe your ideal home</label>
          <textarea
            id="request"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            rows={4}
            maxLength={1200}
          />
          <div className="form-footer">
            <span>Try budget, ZIP, bedrooms, commute, light, community, or nearby conveniences.</span>
            <button disabled={loading} type="submit">
              {loading ? "Ranking homes…" : "Find my matches"}
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
              <p className="eyebrow">Your personalized shortlist</p>
              <h2>{result.matches.length ? `${result.matches.length} homes rise to the top` : "No exact matches yet"}</h2>
            </div>
            <span className={`mode ${result.mode === "gpt-5.6" ? "live" : "demo"}`}>
              {result.mode === "gpt-5.6" ? "Interpreted by GPT-5.6" : "Local demo mode"}
            </span>
          </div>

          {result.warning && <p className="notice">{result.warning}</p>}

          <section className="refinement-panel" aria-labelledby="refinement-title">
            <div className="refinement-copy">
              <span className="loop-number">2</span>
              <div>
                <p className="card-kicker">Refine without starting over</p>
                <h3 id="refinement-title">What changed after seeing these homes?</h3>
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
                  {refining ? "Updating..." : "Update my ranking"}
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
              {refineError && <p className="error" role="alert">{refineError}</p>}
            </form>
          </section>

          {result.changes && (
            <div className="change-summary" role="status">
              <div>
                <p className="card-kicker">Profile update</p>
                <h3>{result.changes.length ? "Your agent changed only these preferences" : "No profile values changed"}</h3>
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
              <p className="card-kicker">What we heard</p>
              <h3>Your decision profile</h3>
              <dl className="constraints">
                <div><dt>ZIP</dt><dd>{result.preferences.zipCode}</dd></div>
                <div><dt>Budget</dt><dd>{money.format(result.preferences.maxPrice)}</dd></div>
                <div><dt>Bedrooms</dt><dd>{result.preferences.minBedrooms}+</dd></div>
                <div><dt>Commute to DC</dt><dd>&le; {result.preferences.maxCommuteMinutes} min</dd></div>
              </dl>
              <div className="priority-list">
                <div className="priority-heading">
                  <p>Priority weights</p>
                  <small>Drag to rerank</small>
                </div>
                {priorityKeys.map((key) => (
                  <label className="priority" key={key} htmlFor={`priority-${key}`}>
                    <span>{factorLabels[key]}</span>
                    <input
                      id={`priority-${key}`}
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={result.preferences.priorities[key]}
                      onChange={(event) => adjustPriority(key, Number(event.target.value))}
                    />
                    <output htmlFor={`priority-${key}`}>{result.preferences.priorities[key]}</output>
                  </label>
                ))}
                <p className="weight-status" aria-live="polite">{weightStatus}</p>
              </div>
              {result.preferences.assumptions.length > 0 && (
                <div className="assumptions">
                  <p>Assumptions</p>
                  <ul>{result.preferences.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
              <small>Sample listings and estimates are for product demonstration only.</small>
            </aside>

            <div className="matches">
              <ShortlistMap matches={result.matches} />
              {result.matches.length === 0 ? (
                <div className="empty-state">
                  <h3>Your constraints filtered every sample home.</h3>
                  <p>Raise the budget or extend the commute to see more sample homes in 20878.</p>
                </div>
              ) : result.matches.map((home, index) => {
                const movement = movementFor(home.id, index + 1);
                return (
                <article className="home-card" key={home.id} id={`match-${home.id}`}>
                  <div className="rank-block">
                    <span>#{index + 1}</span>
                    <strong>{home.score}</strong>
                    <small>match</small>
                    {movement && <em className={`movement ${movement.tone}`}>{movement.label}</em>}
                  </div>
                  <div className="home-body">
                    <div className="home-title">
                      <div>
                        <p>{home.style}</p>
                        <h3>{home.address}</h3>
                        <span>{home.city}, {home.state} {home.zipCode}</span>
                      </div>
                      <strong className="price">{money.format(home.price)}</strong>
                    </div>
                    <p className="description">{home.description}</p>
                    <div className="facts">
                      <span><strong>{home.bedrooms}</strong> beds</span>
                      <span><strong>{home.bathrooms}</strong> baths</span>
                      <span><strong>{home.squareFeet.toLocaleString()}</strong> sq ft</span>
                      <span><strong>{money.format(home.monthlyCost)}</strong>/mo est.</span>
                    </div>
                    <div className="reason-grid">
                      <div className="strength">
                        <span>Why it fits</span>
                        <p>{home.strengths[0]}</p>
                      </div>
                      <div className="tradeoff">
                        <span>Trade-off</span>
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
          <div><strong>01</strong><span>Describe what matters</span></div>
          <div><strong>02</strong><span>See the ranking logic</span></div>
          <div><strong>03</strong><span>Refine without starting over</span></div>
        </section>
      )}
    </main>
  );
}
