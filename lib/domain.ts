export const priorityKeys = [
  "affordability",
  "commute",
  "space",
  "outdoorSpace",
  "naturalLight",
  "communityAppeal",
  "convenience",
  "schoolAccess",
] as const;

export type PriorityKey = (typeof priorityKeys)[number];

export type PriorityWeights = Record<PriorityKey, number>;

export interface BuyerPreferences {
  zipCode: string;
  maxPrice: number;
  minBedrooms: number;
  maxCommuteMinutes: number;
  mustHaveOutdoorSpace: boolean;
  priorities: PriorityWeights;
  assumptions: string[];
}

export interface Listing {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  monthlyCost: number;
  commuteMinutes: number;
  outdoorSpace: boolean;
  naturalLight: number;
  communityAppeal: number;
  convenience: number;
  schoolAccess: number;
  style: string;
  listingStatus: "For sale" | "Coming soon";
  zillowUrl: string;
  description: string;
}

export type ScoreBreakdown = PriorityWeights;

export interface RankedListing extends Listing {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  strengths: string[];
  compromises: string[];
}

export interface PreferenceChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface MatchResponse {
  mode: "gpt-5.6" | "demo";
  warning?: string;
  preferences: BuyerPreferences;
  matches: RankedListing[];
  changes?: PreferenceChange[];
}
