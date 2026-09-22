import "server-only";
import { integrationFetch } from "@/lib/insecureFetch";
import type { SportsTeamConfig } from "@/lib/types";
import { LEAGUE_META, type SportsLeague } from "@/lib/sportsLeagues";

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";

// The "switch at 12pm" cutover is a wall-clock concept for whoever's
// looking at the dashboard, not the server's own clock — which, running in
// a container, is very likely UTC regardless of where the pod physically
// runs. Fixed to Eastern since that's this app's timezone.
const REFERENCE_TIME_ZONE = "America/New_York";

export type SportsTeamOption = { id: string; name: string; logo?: string };

export type SportsGameData = {
  teamName: string;
  teamAbbr: string;
  teamLogo?: string;
  /** ESPN's team page — the title links here. */
  teamHref?: string;
  mode: "live" | "final" | "upcoming" | "none";
  isHome?: boolean;
  opponentName?: string;
  opponentAbbr?: string;
  teamScore?: string;
  opponentScore?: string;
  gameDate?: string;
  /** ESPN's own human-readable status, e.g. "Top 7th", "Final", "7:10 PM EDT". */
  statusDetail?: string;
  /** ESPN's game page — the matchup line links here. */
  gameHref?: string;
};

type EspnTeamRef = { id: string; displayName: string; abbreviation: string; logos?: Array<{ href: string }>; logo?: string };
type EspnCompetitor = { team: EspnTeamRef; homeAway: "home" | "away"; score?: { displayValue?: string } };
type EspnEvent = {
  date: string;
  links?: Array<{ href: string }>;
  competitions: Array<{
    status: { type: { state: "pre" | "in" | "post"; completed: boolean; shortDetail?: string } };
    competitors: EspnCompetitor[];
  }>;
};

function currentHourInReferenceZone(): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: REFERENCE_TIME_ZONE,
    hourCycle: "h23",
    hour: "2-digit",
  }).format(new Date());
  return Number(formatted);
}

function leagueMeta(league: string): { sport: string; slug: string } {
  const meta = LEAGUE_META[league as SportsLeague];
  if (!meta) throw new Error("Unknown league.");
  return meta;
}

export async function fetchSportsTeams(league: string): Promise<SportsTeamOption[]> {
  const { sport, slug } = leagueMeta(league);
  const res = await integrationFetch(`${BASE_URL}/${sport}/${slug}/teams?limit=100`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN API error (${res.status})`);
  const body = (await res.json()) as { sports?: Array<{ leagues?: Array<{ teams?: Array<{ team: EspnTeamRef }> }> }> };
  const teams = body.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams
    .map(({ team }) => ({ id: team.id, name: team.displayName, logo: team.logos?.[0]?.href }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchSportsTeamData(config: SportsTeamConfig): Promise<SportsGameData> {
  if (!config.teamId) throw new Error("No team selected.");
  const { sport, slug } = leagueMeta(config.league);

  const res = await integrationFetch(`${BASE_URL}/${sport}/${slug}/teams/${config.teamId}/schedule`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN API error (${res.status})`);
  const body = (await res.json()) as {
    team: { displayName: string; abbreviation: string; logo?: string; clubhouse?: string };
    events?: EspnEvent[];
  };
  const team = body.team;
  const events = body.events ?? [];
  const now = Date.now();

  function describe(e: EspnEvent, mode: SportsGameData["mode"]): SportsGameData {
    const comp = e.competitions[0];
    const mine = comp.competitors.find((c) => c.team.id === String(config.teamId));
    const opp = comp.competitors.find((c) => c.team.id !== String(config.teamId));
    const gameHref = e.links?.find((l) => /\/game\/_\/gameId\//.test(l.href))?.href ?? e.links?.[0]?.href;
    return {
      teamName: team.displayName,
      teamAbbr: team.abbreviation,
      teamLogo: team.logo,
      teamHref: team.clubhouse,
      mode,
      isHome: mine?.homeAway === "home",
      opponentName: opp?.team.displayName,
      opponentAbbr: opp?.team.abbreviation,
      teamScore: mine?.score?.displayValue,
      opponentScore: opp?.score?.displayValue,
      gameDate: e.date,
      statusDetail: comp.status.type.shortDetail,
      gameHref,
    };
  }

  const live = events.find((e) => e.competitions[0].status.type.state === "in");
  if (live) return describe(live, "live");

  const finals = events
    .filter((e) => {
      const s = e.competitions[0].status.type;
      return s.state === "post" && s.completed && new Date(e.date).getTime() <= now;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastFinal = finals[0];

  const upcoming = events
    .filter((e) => e.competitions[0].status.type.state === "pre" && new Date(e.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextGame = upcoming[0];

  const pastNoon = currentHourInReferenceZone() >= 12;

  if (!pastNoon && lastFinal) return describe(lastFinal, "final");
  if (nextGame) return describe(nextGame, "upcoming");
  if (lastFinal) return describe(lastFinal, "final");

  return { teamName: team.displayName, teamAbbr: team.abbreviation, teamLogo: team.logo, teamHref: team.clubhouse, mode: "none" };
}
