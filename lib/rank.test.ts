import { describe, expect, it } from "vitest";
import { listings } from "@/data/listings";
import {
  diffPreferences,
  parsePreferencesLocally,
  refinePreferencesLocally,
} from "@/lib/preferences";
import { rankListings } from "@/lib/rank";

describe("home matching vertical slice", () => {
  it("extracts common constraints in demo mode", () => {
    const preferences = parsePreferencesLocally(
      "I want a bright 3-bedroom in 20878 under $800k. Keep my commute to DC under 1 hour. Pretty community and convenient to groceries and restaurants.",
    );

    expect(preferences.zipCode).toBe("20878");
    expect(preferences.maxPrice).toBe(800000);
    expect(preferences.minBedrooms).toBe(3);
    expect(preferences.maxCommuteMinutes).toBe(60);
    expect(preferences.priorities.naturalLight).toBeGreaterThan(50);
    expect(preferences.priorities.communityAppeal).toBeGreaterThan(50);
    expect(preferences.priorities.convenience).toBeGreaterThan(50);
    expect(preferences.assumptions.some((assumption) => assumption.startsWith("Minimum bedrooms"))).toBe(false);
  });

  it("enforces hard constraints before ranking", () => {
    const preferences = parsePreferencesLocally(
      "I need 3 bedrooms in 20878 under $800k and a commute under 1 hour",
    );
    const matches = rankListings(listings, preferences);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((home) => home.bedrooms >= 3)).toBe(true);
    expect(matches.every((home) => home.price <= 800000)).toBe(true);
    expect(matches.every((home) => home.commuteMinutes <= 60)).toBe(true);
    expect(matches.every((home) => home.zipCode === "20878")).toBe(true);
  });

  it("returns results in descending score order", () => {
    const preferences = parsePreferencesLocally(
      "I want a bright 3 bedroom in 20878 under $800k near groceries and restaurants",
    );
    const matches = rankListings(listings, preferences);

    expect(matches.length).toBeGreaterThan(1);
    expect(matches.map((home) => home.score)).toEqual(
      [...matches].map((home) => home.score).sort((a, b) => b - a),
    );
  });

  it("reranks immediately when a buyer changes priority weights", () => {
    const base = parsePreferencesLocally(
      "I want a 3 bedroom in 20878 under $800k with a commute under 1 hour",
    );
    const zeroWeights = Object.fromEntries(
      Object.keys(base.priorities).map((key) => [key, 0]),
    ) as typeof base.priorities;

    const affordabilityFirst = rankListings(listings, {
      ...base,
      priorities: { ...zeroWeights, affordability: 100 },
    });
    const spaceFirst = rankListings(listings, {
      ...base,
      priorities: { ...zeroWeights, space: 100 },
    });

    expect(affordabilityFirst[0].id).toBe("quince-orchard");
    expect(spaceFirst[0].id).toBe("orchard-ridge");
  });

  it("preserves unrelated constraints during a refinement", () => {
    const initial = parsePreferencesLocally(
      "I want a bright 3 bedroom in 20878 under $800k with a commute under 1 hour",
    );
    const refined = refinePreferencesLocally(
      "Commute matters less now, but outdoor space is required.",
      initial,
    );

    expect(refined.zipCode).toBe(initial.zipCode);
    expect(refined.maxPrice).toBe(initial.maxPrice);
    expect(refined.minBedrooms).toBe(initial.minBedrooms);
    expect(refined.maxCommuteMinutes).toBe(initial.maxCommuteMinutes);
    expect(refined.priorities.commute).toBeLessThan(initial.priorities.commute);
    expect(refined.mustHaveOutdoorSpace).toBe(true);
    expect(refined.priorities.outdoorSpace).toBe(100);
  });

  it("reports preference changes and reranks against the updated hard constraint", () => {
    const initial = parsePreferencesLocally(
      "I want a 3 bedroom in 20878 under $800k with a commute under 1 hour",
    );
    const refined = refinePreferencesLocally("Outdoor space is now required.", initial);
    const changes = diffPreferences(initial, refined);
    const matches = rankListings(listings, refined);

    expect(changes.map((change) => change.field)).toContain("mustHaveOutdoorSpace");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((home) => home.outdoorSpace)).toBe(true);
  });
});
