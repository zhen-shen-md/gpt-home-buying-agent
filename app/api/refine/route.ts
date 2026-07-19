import { NextResponse } from "next/server";
import { z } from "zod";
import { listings } from "@/data/listings";
import { BuyerPreferencesSchema, refinePreferences } from "@/lib/preferences";
import { rankListings } from "@/lib/rank";

const RefineRequest = z.object({
  followUp: z.string().trim().min(4).max(800),
  currentPreferences: BuyerPreferencesSchema,
});

export async function POST(request: Request) {
  try {
    const body = RefineRequest.parse(await request.json());
    const refined = await refinePreferences(body.followUp, body.currentPreferences);
    const matches = rankListings(listings, refined.preferences);

    return NextResponse.json({ ...refined, matches });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Describe what changed in at least four characters." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "We could not refine this shortlist right now." }, { status: 500 });
  }
}
