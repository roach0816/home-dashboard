import { NextRequest, NextResponse } from "next/server";
import { fetchSportsTeams } from "@/lib/integrations/sports";
import { isSportsLeague } from "@/lib/sportsLeagues";
import { describeError } from "@/lib/integrations/util";

// Special-cased (not routed through the generic widget system) because it's
// used while composing a new sports widget, before it's been saved
// anywhere — same reasoning as /api/integrations/tempest/stations. No
// token needed here since ESPN's site API is public.
export async function GET(request: NextRequest) {
  const league = request.nextUrl.searchParams.get("league");
  if (!league || !isSportsLeague(league)) {
    return NextResponse.json({ error: "Unknown or missing league" }, { status: 400 });
  }

  try {
    const teams = await fetchSportsTeams(league);
    return NextResponse.json({ teams });
  } catch (err) {
    return NextResponse.json({ error: describeError(err, "Failed to fetch teams") }, { status: 502 });
  }
}
