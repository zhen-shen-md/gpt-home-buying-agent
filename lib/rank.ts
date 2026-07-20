import { priorityKeys, type BuyerPreferences, type Listing, type RankedListing } from "@/lib/domain";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const labels = {
  affordability: "Affordability",
  commute: "Commute",
  space: "Space",
  outdoorSpace: "Outdoor space",
  naturalLight: "Natural light",
  communityAppeal: "Community appeal",
  convenience: "Groceries and restaurants",
  schoolAccess: "School access",
} as const;

export function rankListings(
  listings: Listing[],
  preferences: BuyerPreferences,
  limit = 5,
): RankedListing[] {
  const eligible = listings.filter(
    (listing) =>
      listing.zipCode === preferences.zipCode &&
      listing.price <= preferences.maxPrice &&
      listing.bedrooms >= preferences.minBedrooms &&
      listing.commuteMinutes <= preferences.maxCommuteMinutes &&
      (!preferences.mustHaveOutdoorSpace || listing.outdoorSpace),
  );

  const maxSquareFeet = Math.max(...eligible.map((listing) => listing.squareFeet), 1);
  const weightTotal = priorityKeys.reduce((sum, key) => sum + preferences.priorities[key], 0) || 1;

  return eligible
    .map((listing) => {
      const scoreBreakdown = {
        affordability: Math.round(clamp(1 - listing.price / preferences.maxPrice + 0.72) * 100),
        commute: Math.round(clamp(1 - listing.commuteMinutes / preferences.maxCommuteMinutes) * 100),
        space: Math.round(clamp(listing.squareFeet / maxSquareFeet) * 100),
        outdoorSpace: listing.outdoorSpace ? 100 : 20,
        naturalLight: Math.round(clamp(listing.naturalLight / 5) * 100),
        communityAppeal: Math.round(clamp(listing.communityAppeal / 5) * 100),
        convenience: Math.round(clamp(listing.convenience / 5) * 100),
        schoolAccess: Math.round(clamp(listing.schoolAccess / 5) * 100),
      };

      const score = Math.round(
        priorityKeys.reduce(
          (sum, key) => sum + scoreBreakdown[key] * preferences.priorities[key],
          0,
        ) / weightTotal,
      );

      const orderedFactors = priorityKeys
        .map((key) => ({ key, score: scoreBreakdown[key], weight: preferences.priorities[key] }))
        .filter((factor) => factor.weight > 0)
        .sort((a, b) => b.score * b.weight - a.score * a.weight);

      const strengths = orderedFactors
        .filter((factor) => factor.score >= 70)
        .slice(0, 2)
        .map((factor) => `${labels[factor.key]} is a strong fit (${factor.score}/100).`);
      const compromises = orderedFactors
        .filter((factor) => factor.score < 65)
        .sort((a, b) => a.score - b.score)
        .slice(0, 2)
        .map((factor) => `${labels[factor.key]} is the main trade-off (${factor.score}/100).`);

      return {
        ...listing,
        score,
        scoreBreakdown,
        strengths: strengths.length ? strengths : ["Meets every hard constraint."],
        compromises: compromises.length ? compromises : ["No major compromise in the stated priorities."],
      };
    })
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .slice(0, limit);
}
