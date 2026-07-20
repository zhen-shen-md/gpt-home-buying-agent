import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  priorityKeys,
  type BuyerPreferences,
  type PreferenceChange,
  type PriorityKey,
  type PriorityWeights,
} from "@/lib/domain";

const PriorityWeightsSchema = z.object({
  affordability: z.number().int().min(0).max(100),
  commute: z.number().int().min(0).max(100),
  space: z.number().int().min(0).max(100),
  outdoorSpace: z.number().int().min(0).max(100),
  naturalLight: z.number().int().min(0).max(100),
  communityAppeal: z.number().int().min(0).max(100),
  convenience: z.number().int().min(0).max(100),
  schoolAccess: z.number().int().min(0).max(100),
});

const ExtractedPreferences = z.object({
  zipCode: z.string().nullable(),
  maxPrice: z.number().int().positive().nullable(),
  minBedrooms: z.number().int().min(0).max(10).nullable(),
  maxCommuteMinutes: z.number().int().min(0).max(240).nullable(),
  mustHaveOutdoorSpace: z.boolean(),
  priorities: PriorityWeightsSchema,
});

type ExtractedPreferences = z.infer<typeof ExtractedPreferences>;

const RefinedPreferences = z.object({
  zipCode: z.string(),
  maxPrice: z.number().int().positive(),
  minBedrooms: z.number().int().min(0).max(10),
  maxCommuteMinutes: z.number().int().min(0).max(240),
  mustHaveOutdoorSpace: z.boolean(),
  priorities: PriorityWeightsSchema,
});

export const BuyerPreferencesSchema = RefinedPreferences.extend({
  assumptions: z.array(z.string()),
});

const defaults = {
  zipCode: "20878",
  maxPrice: 800000,
  minBedrooms: 3,
  maxCommuteMinutes: 60,
};

const defaultPriorities: PriorityWeights = {
  affordability: 55,
  commute: 55,
  space: 45,
  outdoorSpace: 35,
  naturalLight: 50,
  communityAppeal: 45,
  convenience: 45,
  schoolAccess: 40,
};

function completePreferences(extracted: ExtractedPreferences): BuyerPreferences {
  const assumptions: string[] = [];
  const value = <T,>(candidate: T | null, fallback: T, label: string) => {
    if (candidate !== null) return candidate;
    assumptions.push(`${label} was not stated; using ${fallback}.`);
    return fallback;
  };

  const total = Object.values(extracted.priorities).reduce((sum, weight) => sum + weight, 0);
  const priorities = total === 0 ? defaultPriorities : extracted.priorities;
  if (total === 0) assumptions.push("No relative priorities were detected; using balanced weights.");

  return {
    zipCode: value(extracted.zipCode, defaults.zipCode, "ZIP code"),
    maxPrice: value(extracted.maxPrice, defaults.maxPrice, "Maximum price"),
    minBedrooms: value(extracted.minBedrooms, defaults.minBedrooms, "Minimum bedrooms"),
    maxCommuteMinutes: value(
      extracted.maxCommuteMinutes,
      defaults.maxCommuteMinutes,
      "Maximum commute",
    ),
    mustHaveOutdoorSpace: extracted.mustHaveOutdoorSpace,
    priorities,
    assumptions,
  };
}

function keywordWeight(request: string, patterns: RegExp[], high: number, fallback: number) {
  return patterns.some((pattern) => pattern.test(request)) ? high : fallback;
}

function extractCommuteMinutes(request: string) {
  const durationPattern = "(?:under|max(?:imum)?|within|up to|can be(?:\\s+up to)?)\\s+";
  const minutes = request.match(new RegExp(`${durationPattern}(\\d+(?:\\.\\d+)?)\\s*(?:min|minutes?)`, "i"));
  if (minutes) return Math.round(Number(minutes[1]));

  const hours = request.match(new RegExp(`${durationPattern}(\\d+(?:\\.\\d+)?)\\s*(?:hours?|hrs?)`, "i"));
  return hours ? Math.round(Number(hours[1]) * 60) : null;
}

export function parsePreferencesLocally(request: string): BuyerPreferences {
  const zipCode = request.match(/\b\d{5}\b/)?.[0] ?? null;
  const priceMatch = request.match(/(?:\$|under\s+|budget(?:\s+of|\s+is|\s+now)?\s+|up to\s+)([\d,.]+)\s*([km])?/i);
  const bedroomsMatch = request.match(/(?:at least\s+)?(\d+)\s*-?\s*(?:bed|bedroom)/i);
  const commuteMinutes = extractCommuteMinutes(request);
  const amount = priceMatch ? Number(priceMatch[1].replaceAll(",", "")) : null;
  const multiplier = priceMatch?.[2]?.toLowerCase() === "m" ? 1_000_000 : priceMatch?.[2] ? 1_000 : 1;
  const outdoorRequired = /must\s+have.*(?:yard|outdoor|terrace|balcony)/i.test(request);

  return completePreferences({
    zipCode,
    maxPrice: amount ? Math.round(amount * multiplier) : null,
    minBedrooms: bedroomsMatch ? Number(bedroomsMatch[1]) : null,
    maxCommuteMinutes: commuteMinutes,
    mustHaveOutdoorSpace: outdoorRequired,
    priorities: {
      affordability: keywordWeight(request, [/budget/i, /afford/i, /under\s+\$?/i, /monthly cost/i], 80, 45),
      commute: keywordWeight(request, [/commute/i, /path/i, /train/i, /work/i], 85, 40),
      space: keywordWeight(request, [/space/i, /large/i, /square feet/i, /bedroom/i], 70, 40),
      outdoorSpace: keywordWeight(request, [/yard/i, /outdoor/i, /terrace/i, /balcony/i], 85, 30),
      naturalLight: keywordWeight(request, [/natural light/i, /sunny/i, /bright/i, /window/i], 90, 40),
      communityAppeal: keywordWeight(request, [/pretty communit/i, /beautiful communit/i, /charming/i, /tree-lined/i, /attractive neighborhood/i], 85, 40),
      convenience: keywordWeight(request, [/convenient/i, /grocer/i, /restaurant/i, /shops?/i, /walkab/i], 85, 40),
      schoolAccess: keywordWeight(request, [/school access/i, /near(?:by)? schools?/i, /close to schools?/i, /walk to school/i, /schools?/i], 85, 35),
    },
  });
}

const preferenceLabels: Record<PriorityKey, string> = {
  affordability: "Affordability priority",
  commute: "Commute priority",
  space: "Space priority",
  outdoorSpace: "Outdoor-space priority",
  naturalLight: "Natural-light priority",
  communityAppeal: "Community-appeal priority",
  convenience: "Groceries-and-restaurants priority",
  schoolAccess: "School-access priority",
};

const priorityTopics: Record<PriorityKey, string> = {
  affordability: "budget|price|affordability|monthly cost",
  commute: "commute|travel time|PATH|train|work",
  space: "space|square feet|bedrooms?|room",
  outdoorSpace: "outdoor space|yard|garden|terrace|balcony",
  naturalLight: "natural light|sunlight|sunny|bright|windows?",
  communityAppeal: "pretty community|beautiful community|community appeal|charming|tree-lined|attractive neighborhood",
  convenience: "convenience|convenient|groceries|grocery|restaurants?|shops?|walkability|walkable",
  schoolAccess: "school access|nearby schools?|close to schools?|walk to school|schools?",
};

const lowerPriorityPhrase = "less important|matters? less|lower priority|care less|not as important";
const higherPriorityPhrase = "more important|matters? more|higher priority|prioriti[sz]e|care more|matters? most|most important";

function mentionsWithIntent(request: string, topic: string, intent: string) {
  return (
    new RegExp(`(?:${topic}).{0,36}(?:${intent})`, "i").test(request) ||
    new RegExp(`(?:${intent}).{0,36}(?:${topic})`, "i").test(request)
  );
}

function removeResolvedAssumptions(
  assumptions: string[],
  changedFields: Set<string>,
) {
  const assumptionPrefixes: Record<string, string> = {
    zipCode: "ZIP code",
    maxPrice: "Maximum price",
    minBedrooms: "Minimum bedrooms",
    maxCommuteMinutes: "Maximum commute",
  };

  return assumptions.filter((assumption) => {
    for (const [field, prefix] of Object.entries(assumptionPrefixes)) {
      if (changedFields.has(field) && assumption.startsWith(prefix)) return false;
    }
    if (
      [...changedFields].some((field) => field.startsWith("priorities.")) &&
      assumption.startsWith("No relative priorities")
    ) return false;
    return true;
  });
}

export function diffPreferences(
  previous: BuyerPreferences,
  next: BuyerPreferences,
): PreferenceChange[] {
  const changes: PreferenceChange[] = [];
  const add = (field: string, label: string, before: string | number, after: string | number) => {
    if (before === after) return;
    changes.push({ field, label, before: String(before), after: String(after) });
  };

  add("zipCode", "ZIP code", previous.zipCode, next.zipCode);
  add("maxPrice", "Maximum price", `$${previous.maxPrice.toLocaleString()}`, `$${next.maxPrice.toLocaleString()}`);
  add("minBedrooms", "Minimum bedrooms", previous.minBedrooms, next.minBedrooms);
  add(
    "maxCommuteMinutes",
    "Maximum commute",
    `${previous.maxCommuteMinutes} min`,
    `${next.maxCommuteMinutes} min`,
  );
  add(
    "mustHaveOutdoorSpace",
    "Outdoor space",
    previous.mustHaveOutdoorSpace ? "Required" : "Preferred",
    next.mustHaveOutdoorSpace ? "Required" : "Preferred",
  );

  for (const key of priorityKeys) {
    add(
      `priorities.${key}`,
      preferenceLabels[key],
      previous.priorities[key],
      next.priorities[key],
    );
  }

  return changes;
}

export function refinePreferencesLocally(
  followUp: string,
  current: BuyerPreferences,
): BuyerPreferences {
  const next: BuyerPreferences = {
    ...current,
    priorities: { ...current.priorities },
    assumptions: [...current.assumptions],
  };
  const changedFields = new Set<string>();

  const zipCode = followUp.match(/\b\d{5}\b/)?.[0];
  if (zipCode && zipCode !== next.zipCode) {
    next.zipCode = zipCode;
    changedFields.add("zipCode");
  }

  const priceMatch = followUp.match(/(?:\$|under\s+|budget(?:\s+of|\s+is|\s+now)?\s+|up to\s+)([\d,.]+)\s*([km])?/i);
  if (priceMatch) {
    const amount = Number(priceMatch[1].replaceAll(",", ""));
    const multiplier = priceMatch[2]?.toLowerCase() === "m" ? 1_000_000 : priceMatch[2] ? 1_000 : 1;
    next.maxPrice = Math.round(amount * multiplier);
    changedFields.add("maxPrice");
  }

  const bedroomsMatch = followUp.match(/(?:at least\s+|minimum\s+)?(\d+)\s*-?\s*(?:bed|bedroom)/i);
  if (bedroomsMatch) {
    next.minBedrooms = Number(bedroomsMatch[1]);
    changedFields.add("minBedrooms");
  }

  const commuteMinutes = extractCommuteMinutes(followUp);
  if (commuteMinutes !== null) {
    next.maxCommuteMinutes = commuteMinutes;
    changedFields.add("maxCommuteMinutes");
  }

  const outdoorTopic = priorityTopics.outdoorSpace;
  if (
    new RegExp(`(?:must|need|require|required).{0,28}(?:${outdoorTopic})|(?:${outdoorTopic}).{0,28}(?:must|need|require|required)`, "i").test(followUp)
  ) {
    next.mustHaveOutdoorSpace = true;
    next.priorities.outdoorSpace = 100;
    changedFields.add("mustHaveOutdoorSpace");
    changedFields.add("priorities.outdoorSpace");
  } else if (
    new RegExp(`(?:do not need|don't need|no longer need).{0,28}(?:${outdoorTopic})|(?:${outdoorTopic}).{0,28}(?:optional|not required|nice to have)`, "i").test(followUp)
  ) {
    next.mustHaveOutdoorSpace = false;
    changedFields.add("mustHaveOutdoorSpace");
  }

  const clauses = followUp.split(/[.;]|,\s*(?:but|and)\s+|\bbut\b/i);
  for (const key of priorityKeys) {
    if (changedFields.has(`priorities.${key}`)) continue;
    const topic = priorityTopics[key];
    const topicClauses = clauses.filter((clause) => new RegExp(`(?:${topic})`, "i").test(clause));
    if (topicClauses.some((clause) => mentionsWithIntent(clause, topic, lowerPriorityPhrase))) {
      next.priorities[key] = Math.max(10, Math.round(current.priorities[key] * 0.55));
      changedFields.add(`priorities.${key}`);
    } else if (topicClauses.some((clause) => mentionsWithIntent(clause, topic, higherPriorityPhrase))) {
      next.priorities[key] = Math.max(current.priorities[key], 90);
      changedFields.add(`priorities.${key}`);
    }
  }

  next.assumptions = removeResolvedAssumptions(next.assumptions, changedFields);
  return next;
}

function withPreservedAssumptions(
  current: BuyerPreferences,
  refined: z.infer<typeof RefinedPreferences>,
) {
  const next: BuyerPreferences = { ...refined, assumptions: [...current.assumptions] };
  const changedFields = new Set(diffPreferences(current, next).map((change) => change.field));
  next.assumptions = removeResolvedAssumptions(next.assumptions, changedFields);
  return next;
}

export async function parsePreferences(request: string): Promise<{
  preferences: BuyerPreferences;
  mode: "gpt-5.6" | "demo";
  warning?: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      preferences: parsePreferencesLocally(request),
      mode: "demo",
      warning: "No OPENAI_API_KEY is configured, so a local demo parser interpreted this request.",
    };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6",
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content:
            "Extract explicitly stated home-buying constraints and relative priorities. Use null for missing scalar constraints. Assign 0-100 priority weights based only on the buyer's emphasis. Do not infer preferences involving protected characteristics or demographic proxies. Treat school-related language only as access or proximity; never infer or score school quality, rankings, test scores, student demographics, or protected-characteristic proxies. Outdoor space is a hard requirement only when the buyer clearly says it is required or a must-have.",
        },
        { role: "user", content: request },
      ],
      text: {
        format: zodTextFormat(ExtractedPreferences, "buyer_preferences"),
      },
    });

    if (!response.output_parsed) throw new Error("GPT-5.6 returned no parsed preferences.");
    return { preferences: completePreferences(response.output_parsed), mode: "gpt-5.6" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI API error";
    return {
      preferences: parsePreferencesLocally(request),
      mode: "demo",
      warning: `GPT-5.6 was unavailable (${message}). The local demo parser was used instead.`,
    };
  }
}

export async function refinePreferences(
  followUp: string,
  current: BuyerPreferences,
): Promise<{
  preferences: BuyerPreferences;
  changes: PreferenceChange[];
  mode: "gpt-5.6" | "demo";
  warning?: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    const preferences = refinePreferencesLocally(followUp, current);
    return {
      preferences,
      changes: diffPreferences(current, preferences),
      mode: "demo",
      warning: "No OPENAI_API_KEY is configured, so the local demo refiner updated this profile.",
    };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6",
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content:
            "Update a complete home-buying preference profile from one buyer follow-up. Copy every existing value exactly unless the follow-up explicitly changes it. Translate statements such as 'commute matters less' into a lower relative 0-100 weight while preserving unrelated weights. Change a hard constraint only when the buyer explicitly requires, relaxes, or replaces it. Treat school-related language only as access or proximity; never infer or score school quality, rankings, test scores, student demographics, protected characteristics, or demographic proxies. Return only the complete revised profile through the provided schema.",
        },
        {
          role: "user",
          content: `Existing preference profile:\n${JSON.stringify({
            zipCode: current.zipCode,
            maxPrice: current.maxPrice,
            minBedrooms: current.minBedrooms,
            maxCommuteMinutes: current.maxCommuteMinutes,
            mustHaveOutdoorSpace: current.mustHaveOutdoorSpace,
            priorities: current.priorities,
          })}\n\nBuyer follow-up:\n${followUp}`,
        },
      ],
      text: {
        format: zodTextFormat(RefinedPreferences, "refined_buyer_preferences"),
      },
    });

    if (!response.output_parsed) throw new Error("GPT-5.6 returned no refined preferences.");
    const preferences = withPreservedAssumptions(current, response.output_parsed);
    return {
      preferences,
      changes: diffPreferences(current, preferences),
      mode: "gpt-5.6",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI API error";
    const preferences = refinePreferencesLocally(followUp, current);
    return {
      preferences,
      changes: diffPreferences(current, preferences),
      mode: "demo",
      warning: `GPT-5.6 refinement was unavailable (${message}). The local demo refiner was used instead.`,
    };
  }
}
