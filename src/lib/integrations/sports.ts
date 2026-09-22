import "server-only";
import { integrationFetch } from "@/lib/insecureFetch";
import type { SportsTeamConfig } from "@/lib/types";
import { LEAGUE_META, type SportsLeague } from "@/lib/sportsLeagues";

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";

// The cutover is a wall-clock concept for whoever's looking at the
// dashboard, not the server's own clock — which, running in a container,
// is very likely UTC regardless of where the pod physically runs. Fixed to
// Eastern since that's this app's timezone.
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

function easternDateStr(d: Date): string {
  // en-CA formats as YYYY-MM-DD, which sorts/diffs safely as a calendar date.
  return new Intl.DateTimeFormat("en-CA", { timeZone: REFERENCE_TIME_ZONE }).format(d);
}

function daysBetweenEasternDates(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** A final score stays "current" through the rest of the day it was played, then until 11am Eastern the next day — covers doubleheaders and late finishes without flipping to "next game" mid-evening. */
function finalStillCurrent(gameDateIso: string): boolean {
  const daysSinceGame = daysBetweenEasternDates(easternDateStr(new Date(gameDateIso)), easternDateStr(new Date()));
  if (daysSinceGame <= 0) return true;
  if (daysSinceGame === 1) return currentHourInReferenceZone() < 11;
  return false;
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

  // Scans every event in the window rather than assuming "today's game" —
  // on a doubleheader day ESPN returns two separate events, and this
  // always finds whichever one is actually live right now.
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

  if (lastFinal && finalStillCurrent(lastFinal.date)) return describe(lastFinal, "final");
  if (nextGame) return describe(nextGame, "upcoming");
  if (lastFinal) return describe(lastFinal, "final");

  return { teamName: team.displayName, teamAbbr: team.abbreviation, teamLogo: team.logo, teamHref: team.clubhouse, mode: "none" };
}
