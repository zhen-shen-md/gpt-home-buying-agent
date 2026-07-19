import { NextResponse } from "next/server";
import { z } from "zod";
import { listings } from "@/data/listings";
import { parsePreferences } from "@/lib/preferences";
import { rankListings } from "@/lib/rank";

const MatchRequest = z.object({
  request: z.string().trim().min(12).max(1200),
});

export async function POST(request: Request) {
  try {
    const body = MatchRequest.parse(await request.json());
    const parsed = await parsePreferences(body.request);
    const matches = rankListings(listings, parsed.preferences);

    return NextResponse.json({ ...parsed, matches });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Describe your home search in at least 12 characters." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "We could not rank homes right now." }, { status: 500 });
  }
}
