import "server-only";
import { integrationFetch } from "@/lib/insecureFetch";
import type { MlbMagicNumberConfig } from "@/lib/types";
import { MLB_TEAMS } from "@/lib/sportsLeagues";

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb";
const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/baseball/mlb/standings";
const REFERENCE_TIME_ZONE = "America/New_York";

export type MlbMagicNumberData = {
  teamName: string;
  teamAbbr: string;
  teamLogo?: string;
  teamHref?: string;
  mode: "in-season" | "recap";

  // in-season fields
  record?: string;
  streak?: string;
  standingText?: string;
  divisionName?: string;
  divisionMagicNumber?: number | null;
  divisionClinched?: boolean;
  wildCardMagicNumber?: number | null;
  wildCardClinched?: boolean;
  eliminated?: boolean;

  // recap fields
  season?: number;
  headlineTier?: "world-series" | "league" | "division" | "none";
  headlineText?: string;
  contextText?: string;
  nextSeasonOpener?: string;
};

type EspnStatMap = Record<string, { value?: number; displayValue?: string }>;
type LeagueEntry = {
  teamId: string;
  wins: number;
  losses: number;
  divisionGamesBehind: string;
  playoffSeed: number;
  magicNumberDivision: number | null;
  clincher?: string;
  streak?: string;
};

function statMap(stats: Array<{ name: string; value?: number; displayValue?: string }> | undefined): EspnStatMap {
  return Object.fromEntries((stats ?? []).map((s) => [s.name, s]));
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function teamMeta(teamId: string) {
  const meta = MLB_TEAMS.find((t) => t.id === teamId);
  if (!meta) throw new Error("Unknown team.");
  return meta;
}

/** Regular-season game dates (sorted) and the season's contextual year, from the team's schedule. Passing a season fetches that specific year; omitting it uses ESPN's own "currently relevant" resolution. */
async function fetchScheduleSeasonInfo(
  teamId: string,
  season?: number,
): Promise<
  { year: number; regularSeasonDates: string[]; teamName: string; teamAbbr: string; teamHref?: string; teamLogo?: string } | undefined
> {
  const url = `${BASE_URL}/teams/${teamId}/schedule${season ? `?season=${season}` : ""}`;
  const res = await integrationFetch(url, { cache: "no-store" });
  if (!res.ok) return undefined;
  const body = (await res.json()) as {
    season?: { year?: number };
    team?: { displayName?: string; abbreviation?: string; clubhouse?: string; logo?: string };
    events?: Array<{ date: string; seasonType?: { type?: number } }>;
  };
  const year = body.season?.year;
  const events = (body.events ?? []).filter((e) => e.seasonType?.type === 2);
  if (!year || events.length === 0 || !body.team) return undefined;
  return {
    year,
    regularSeasonDates: events.map((e) => e.date).sort(),
    teamName: body.team.displayName ?? "",
    teamAbbr: body.team.abbreviation ?? "",
    teamHref: body.team.clubhouse,
    teamLogo: body.team.logo,
  };
}

async function fetchLeagueStandings(leagueName: "American League" | "National League", season?: number): Promise<LeagueEntry[]> {
  const url = `${STANDINGS_URL}?level=2${season ? `&season=${season}` : ""}`;
  const res = await integrationFetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN API error (${res.status})`);
  const body = (await res.json()) as {
    children?: Array<{ name: string; standings?: { entries?: Array<{ team: { id: string }; stats?: Array<{ name: string; value?: number; displayValue?: string }> }> } }>;
  };
  const league = body.children?.find((c) => c.name === leagueName);
  const entries = league?.standings?.entries ?? [];
  return entries.map((e) => {
    const stats = statMap(e.stats);
    return {
      teamId: e.team.id,
      wins: Number(stats.wins?.value ?? 0),
      losses: Number(stats.losses?.value ?? 0),
      divisionGamesBehind: stats.divisionGamesBehind?.displayValue ?? "-",
      playoffSeed: Number(stats.playoffSeed?.value ?? 99),
      magicNumberDivision: stats.magicNumberDivision ? Number(stats.magicNumberDivision.value) : null,
      clincher: stats.clincher?.displayValue,
      streak: stats.streak?.displayValue,
    };
  });
}

/**
 * ESPN's own magicNumberWildcard field computes against the team in the
 * *last guaranteed* spot (seed 6), not the team that could actually still
 * catch you (seed 7, the first team out) — verified this discrepancy
 * against real standings data. The correct clinch-a-spot number uses the
 * standard formula (163 - your wins - rival's losses) against seed 7.
 */
function computeWildCardMagicNumber(teamId: string, leagueEntries: LeagueEntry[]): number | null {
  const bySeed = [...leagueEntries].sort((a, b) => a.playoffSeed - b.playoffSeed);
  const me = bySeed.find((e) => e.teamId === teamId);
  const seed7 = bySeed[6];
  if (!me || !seed7 || me.playoffSeed > 6) return null;
  return Math.max(0, 163 - me.wins - seed7.losses);
}

function divisionRank(teamId: string, division: string, leagueEntries: LeagueEntry[]): number {
  const divisionEntries = leagueEntries
    .filter((e) => MLB_TEAMS.find((t) => t.id === e.teamId)?.division === division)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  return divisionEntries.findIndex((e) => e.teamId === teamId) + 1;
}

const ROUND_RANK: Record<string, number> = { "Wild Card": 1, "Wild Card Series": 1, ALDS: 2, NLDS: 2, ALCS: 3, NLCS: 3, "World Series": 4 };

type RoundSummary = { round: string; rank: number; myWins: number; oppWins: number; opponent: string; won: boolean };
type UpcomingRound = { round: string; date: string };

/**
 * Postseason brackets are published (with placeholder "TBD" opponents) as
 * soon as a team clinches, well before those games are actually played —
 * verified against real current-season data, where every ALDS game for a
 * team that had just clinched showed up as scheduled/incomplete with
 * "TBD" as the opponent. Counting those as losses (0 wins vs the games
 * played) is what caused a team still alive in the postseason to be
 * reported as eliminated. Only games ESPN marks completed count toward a
 * round's outcome; a round with zero completed games hasn't happened yet.
 */
async function fetchPostseasonSummary(
  teamId: string,
  season: number,
): Promise<{ resolved: RoundSummary[]; upcoming?: UpcomingRound }> {
  const res = await integrationFetch(`${BASE_URL}/teams/${teamId}/schedule?season=${season}&seasontype=3`, { cache: "no-store" });
  if (!res.ok) return { resolved: [] };
  const body = (await res.json()) as {
    events?: Array<{
      date: string;
      competitions?: Array<{
        status?: { type?: { completed?: boolean } };
        notes?: Array<{ headline?: string }>;
        competitors?: Array<{ team?: { id?: string; displayName?: string }; winner?: boolean }>;
      }>;
    }>;
  };
  const byRound = new Map<string, Array<{ won: boolean; opponent: string; date: string; completed: boolean }>>();
  for (const e of body.events ?? []) {
    const comp = e.competitions?.[0];
    const headline = comp?.notes?.[0]?.headline;
    const round = headline?.split(" - Game")[0]?.trim();
    if (!round) continue;
    const mine = comp?.competitors?.find((c) => c.team?.id === teamId);
    const opp = comp?.competitors?.find((c) => c.team?.id !== teamId);
    if (!mine || !opp) continue;
    const games = byRound.get(round) ?? [];
    games.push({
      won: Boolean(mine.winner),
      opponent: opp.team?.displayName ?? "",
      date: e.date,
      completed: Boolean(comp?.status?.type?.completed),
    });
    byRound.set(round, games);
  }

  const resolved: RoundSummary[] = [];
  let upcoming: UpcomingRound | undefined;
  for (const [round, allGames] of byRound) {
    allGames.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const played = allGames.filter((g) => g.completed);
    if (played.length === 0) {
      // Nothing in this round has actually happened yet — track the
      // earliest such round as "what's coming up" rather than a result.
      const earliestDate = allGames[0].date;
      if (!upcoming || new Date(earliestDate) < new Date(upcoming.date)) {
        upcoming = { round, date: earliestDate };
      }
      continue;
    }
    const myWins = played.filter((g) => g.won).length;
    resolved.push({
      round,
      rank: ROUND_RANK[round] ?? 0,
      myWins,
      oppWins: played.length - myWins,
      opponent: played[played.length - 1].opponent,
      won: myWins > played.length - myWins,
    });
  }
  return { resolved: resolved.sort((a, b) => a.rank - b.rank), upcoming };
}

export async function fetchMlbMagicNumberData(config: MlbMagicNumberConfig): Promise<MlbMagicNumberData> {
  const teamId = config.teamId;
  if (!teamId) throw new Error("No team selected.");
  const meta = teamMeta(teamId);
  const leagueName = meta.division.startsWith("AL") ? "American League" : "National League";

  const current = await fetchScheduleSeasonInfo(teamId);
  if (!current) throw new Error("Could not load schedule.");
  const now = Date.now();
  const lastRegDate = new Date(current.regularSeasonDates[current.regularSeasonDates.length - 1]).getTime();
  const seasonOver = now > lastRegDate;

  const base = { teamName: current.teamName, teamAbbr: current.teamAbbr, teamLogo: current.teamLogo, teamHref: current.teamHref };

  if (!seasonOver) {
    const leagueEntries = await fetchLeagueStandings(leagueName);
    const me = leagueEntries.find((e) => e.teamId === teamId);
    if (!me) throw new Error("Team not found in standings.");
    const eliminated = me.clincher === "e";
    const wildCardMagicNumber = computeWildCardMagicNumber(teamId, leagueEntries);
    const rank = divisionRank(teamId, meta.division, leagueEntries);
    // ESPN's own clincher flag ("x" division, "y" wild card, "z" best
    // record — verified against live standings data) is the authoritative
    // signal for whether a team has actually clinched. The magic-number-
    // hits-zero check is kept as a fallback for teams the flag hasn't been
    // set on yet, but the flag wins whenever it's present so a brief lag or
    // mismatch between the two fields on ESPN's side can't hide a real
    // clinch that already happened.
    const divisionClinchedByFlag = me.clincher === "x" || me.clincher === "z";
    const wildCardClinchedByFlag = me.clincher === "y" || me.clincher === "z";

    return {
      ...base,
      mode: "in-season",
      record: `${me.wins}-${me.losses}`,
      streak: me.streak,
      standingText: `${ordinal(rank)} in ${meta.division}`,
      divisionName: meta.division,
      divisionMagicNumber: eliminated ? null : me.magicNumberDivision,
      divisionClinched: !eliminated && (divisionClinchedByFlag || (me.magicNumberDivision !== null && me.magicNumberDivision <= 0)),
      wildCardMagicNumber: eliminated ? null : wildCardMagicNumber,
      wildCardClinched: !eliminated && (wildCardClinchedByFlag || (wildCardMagicNumber !== null && wildCardMagicNumber <= 0)),
      eliminated,
    };
  }

  const leagueEntries = await fetchLeagueStandings(leagueName, current.year);
  const me = leagueEntries.find((e) => e.teamId === teamId);
  const { resolved, upcoming } = await fetchPostseasonSummary(teamId, current.year);

  const record = me ? `${me.wins}-${me.losses}` : undefined;
  const divisionChampion = me?.divisionGamesBehind === "-";
  const worldSeries = resolved.find((r) => r.rank === 4);
  const lcs = resolved.find((r) => r.rank === 3);
  const highestResolvedRound = resolved[resolved.length - 1];
  const leagueAbbr = leagueName === "American League" ? "AL" : "NL";

  function upcomingText(): string | undefined {
    if (!upcoming) return undefined;
    const date = new Intl.DateTimeFormat("en-US", { timeZone: REFERENCE_TIME_ZONE, month: "long", day: "numeric" }).format(
      new Date(upcoming.date),
    );
    return `${highestResolvedRound ? "Advanced to" : "Begins"} the ${upcoming.round} — ${date}`;
  }

  let headlineTier: MlbMagicNumberData["headlineTier"] = "none";
  let headlineText = "Season Complete";
  let contextText: string | undefined;

  if (worldSeries?.won) {
    headlineTier = "world-series";
    headlineText = "World Series Champions";
    contextText = `Defeated the ${worldSeries.opponent}, ${worldSeries.myWins} games to ${worldSeries.oppWins}`;
  } else if (lcs?.won) {
    headlineTier = "league";
    headlineText = `${leagueAbbr} Champions`;
    contextText =
      worldSeries && !worldSeries.won
        ? `Lost the World Series to the ${worldSeries.opponent}, ${worldSeries.oppWins} games to ${worldSeries.myWins}`
        : upcomingText();
  } else if (divisionChampion) {
    headlineTier = "division";
    headlineText = `${meta.division} Champions`;
    contextText =
      highestResolvedRound && !highestResolvedRound.won
        ? `Eliminated in the ${highestResolvedRound.round} by the ${highestResolvedRound.opponent}`
        : upcomingText();
  } else if (highestResolvedRound) {
    contextText = highestResolvedRound.won
      ? upcomingText()
      : `Eliminated in the ${highestResolvedRound.round} by the ${highestResolvedRound.opponent}`;
  } else if (upcoming) {
    // A Wild Card team with nothing resolved yet — definitely still made the playoffs.
    headlineText = "Made the Playoffs";
    contextText = upcomingText();
  } else if (me) {
    const rank = divisionRank(teamId, meta.division, leagueEntries);
    contextText = `${ordinal(rank)} in ${meta.division}, ${me.divisionGamesBehind === "-" ? "0" : me.divisionGamesBehind} games back — missed the playoffs`;
  }

  // Still alive in the postseason — the "next season opens" footer would
  // be misleading (and premature) while there's more baseball left to play.
  let nextSeasonOpener: string | undefined;
  if (!upcoming) {
    const next = await fetchScheduleSeasonInfo(teamId, current.year + 1);
    nextSeasonOpener = next?.regularSeasonDates[0];
  }

  return {
    ...base,
    mode: "recap",
    season: current.year,
    record,
    headlineTier,
    headlineText,
    contextText,
    nextSeasonOpener,
  };
}
