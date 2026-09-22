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
  /** Extra detail for a live MLB game only — see fetchMlbLiveDetail(). */
  mlbLive?: MlbLiveDetail;
};

export type MlbLiveDetail = {
  inningNumber: number;
  inningHalf: "top" | "mid" | "bottom" | "end";
  outs: number;
  balls: number;
  strikes: number;
  onFirst: boolean;
  onSecond: boolean;
  onThird: boolean;
  batter?: string;
  pitcher?: string;
  awayAbbr: string;
  awayRuns: number;
  awayHits: number;
  awayErrors: number;
  homeAbbr: string;
  homeRuns: number;
  homeHits: number;
  homeErrors: number;
};

type EspnTeamRef = { id: string; displayName: string; abbreviation: string; logos?: Array<{ href: string }>; logo?: string };
type EspnCompetitor = { team: EspnTeamRef; homeAway: "home" | "away"; score?: { displayValue?: string } };
type EspnEvent = {
  id: string;
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

function parseInningHalf(shortDetail: string | undefined): MlbLiveDetail["inningHalf"] | undefined {
  const m = shortDetail?.trim().match(/^(top|mid|bot(?:tom)?|end)/i);
  if (!m) return undefined;
  const w = m[1].toLowerCase();
  if (w.startsWith("top")) return "top";
  if (w.startsWith("mid")) return "mid";
  if (w.startsWith("bot")) return "bottom";
  return "end";
}

type EspnAthleteRef = { id?: string; shortName?: string; displayName?: string };
type EspnPlay = {
  period?: { type?: string; number?: number };
  outs?: number;
  pitchCount?: { balls?: number; strikes?: number };
  onFirst?: unknown;
  onSecond?: unknown;
  onThird?: unknown;
  participants?: Array<{ athlete?: { id?: string }; type?: string }>;
};
type EspnSummary = {
  header?: {
    competitions?: Array<{
      status?: { period?: number; type?: { shortDetail?: string } };
      competitors?: Array<{
        homeAway: "home" | "away";
        score?: string;
        linescores?: Array<{ hits?: number; errors?: number }>;
        team?: { abbreviation?: string };
      }>;
    }>;
  };
  plays?: EspnPlay[];
  // The starting-lineup "rosters" list omits relief pitchers who enter
  // later — boxscore.players' per-stat-category athlete lists (built from
  // actual stat lines, batting and pitching both) are the complete set of
  // everyone who's actually appeared in the game.
  boxscore?: { players?: Array<{ statistics?: Array<{ athletes?: Array<{ athlete?: EspnAthleteRef }> }> }> };
};

/**
 * The team schedule endpoint (used for everything else) doesn't carry
 * inning/count/base-runner/batter-pitcher detail — that lives in the
 * per-game summary endpoint instead, specifically in its play-by-play feed
 * (the most recent play reflects the current situation) and its roster
 * list (to resolve batter/pitcher ids to names). Best-effort: returns
 * undefined on any unexpected shape rather than breaking the whole widget,
 * since this parses several undocumented ESPN fields.
 */
async function fetchMlbLiveDetail(gameId: string): Promise<MlbLiveDetail | undefined> {
  try {
    const res = await integrationFetch(`${BASE_URL}/baseball/mlb/summary?event=${gameId}`, { cache: "no-store" });
    if (!res.ok) return undefined;
    const body = (await res.json()) as EspnSummary;
    const comp = body.header?.competitions?.[0];
    const away = comp?.competitors?.find((c) => c.homeAway === "away");
    const home = comp?.competitors?.find((c) => c.homeAway === "home");
    if (!comp || !away || !home) return undefined;

    function sumHitsErrors(c: typeof away): { hits: number; errors: number } {
      const ls = c?.linescores ?? [];
      return {
        hits: ls.reduce((sum, inn) => sum + (inn.hits ?? 0), 0),
        errors: ls.reduce((sum, inn) => sum + (inn.errors ?? 0), 0),
      };
    }
    const awayHE = sumHitsErrors(away);
    const homeHE = sumHitsErrors(home);

    const lastPlay = body.plays?.[body.plays.length - 1];

    const rosterMap = new Map<string, string>();
    for (const teamPlayers of body.boxscore?.players ?? []) {
      for (const stat of teamPlayers.statistics ?? []) {
        for (const a of stat.athletes ?? []) {
          if (a.athlete?.id) rosterMap.set(a.athlete.id, a.athlete.shortName || a.athlete.displayName || "");
        }
      }
    }
    const batterId = lastPlay?.participants?.find((p) => p.type === "batter")?.athlete?.id;
    const pitcherId = lastPlay?.participants?.find((p) => p.type === "pitcher")?.athlete?.id;

    return {
      inningNumber: comp.status?.period ?? lastPlay?.period?.number ?? 0,
      inningHalf: parseInningHalf(comp.status?.type?.shortDetail) ?? "top",
      outs: lastPlay?.outs ?? 0,
      balls: lastPlay?.pitchCount?.balls ?? 0,
      strikes: lastPlay?.pitchCount?.strikes ?? 0,
      onFirst: Boolean(lastPlay?.onFirst),
      onSecond: Boolean(lastPlay?.onSecond),
      onThird: Boolean(lastPlay?.onThird),
      batter: batterId ? rosterMap.get(batterId) : undefined,
      pitcher: pitcherId ? rosterMap.get(pitcherId) : undefined,
      awayAbbr: away.team?.abbreviation ?? "",
      awayRuns: Number(away.score ?? 0),
      awayHits: awayHE.hits,
      awayErrors: awayHE.errors,
      homeAbbr: home.team?.abbreviation ?? "",
      homeRuns: Number(home.score ?? 0),
      homeHits: homeHE.hits,
      homeErrors: homeHE.errors,
    };
  } catch {
    return undefined;
  }
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
  if (live) {
    const result = describe(live, "live");
    if (config.league === "mlb") result.mlbLive = await fetchMlbLiveDetail(live.id);
    return result;
  }

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
