import "server-only";
import { integrationFetch } from "@/lib/insecureFetch";
import type { MlbTeamConfig } from "@/lib/types";

const BASE_URL = "https://statsapi.mlb.com/api/v1";

// The "switch at 12pm" cutover is a wall-clock concept for whoever's
// looking at the dashboard, not the server's own clock — which, running
// in a container, is very likely UTC regardless of where the pod
// physically runs. Fixed to Eastern since that's this app's timezone.
const REFERENCE_TIME_ZONE = "America/New_York";

export type MlbGameData = {
  teamName: string;
  teamAbbr: string;
  mode: "live" | "final" | "upcoming" | "none";
  isHome?: boolean;
  opponentName?: string;
  opponentAbbr?: string;
  teamScore?: number;
  opponentScore?: number;
  /** ISO instant of the game (start time for upcoming, actual date for live/final). */
  gameDate?: string;
  inning?: number;
  inningState?: string;
};

type ApiTeam = { team: { id: number; name: string; abbreviation: string }; score?: number };
type ApiGame = {
  gameDate: string;
  status: { abstractGameState: string };
  teams: { away: ApiTeam; home: ApiTeam };
  linescore?: { currentInning?: number; inningState?: string };
};

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function currentHourInReferenceZone(): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: REFERENCE_TIME_ZONE,
    hourCycle: "h23",
    hour: "2-digit",
  }).format(new Date());
  return Number(formatted);
}

function describeGame(g: ApiGame, teamId: number, mode: MlbGameData["mode"]): MlbGameData {
  const isHome = g.teams.home.team.id === teamId;
  const mine = isHome ? g.teams.home : g.teams.away;
  const opp = isHome ? g.teams.away : g.teams.home;
  return {
    teamName: mine.team.name,
    teamAbbr: mine.team.abbreviation,
    mode,
    isHome,
    opponentName: opp.team.name,
    opponentAbbr: opp.team.abbreviation,
    teamScore: mine.score,
    opponentScore: opp.score,
    gameDate: g.gameDate,
    inning: g.linescore?.currentInning,
    inningState: g.linescore?.inningState,
  };
}

export async function fetchMlbTeamData(config: MlbTeamConfig): Promise<MlbGameData> {
  const teamId = config.teamId;
  if (!teamId) throw new Error("No team selected.");

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 4);
  const end = new Date(now);
  end.setDate(end.getDate() + 10);

  const url = `${BASE_URL}/schedule?sportId=1&teamId=${teamId}&startDate=${toDateStr(start)}&endDate=${toDateStr(end)}&hydrate=team,linescore`;
  const res = await integrationFetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`MLB Stats API error (${res.status})`);
  const body = (await res.json()) as { dates?: Array<{ games: ApiGame[] }> };
  const games = (body.dates ?? []).flatMap((d) => d.games);

  const live = games.find((g) => g.status.abstractGameState === "Live");
  if (live) return describeGame(live, teamId, "live");

  const finals = games
    .filter((g) => g.status.abstractGameState === "Final" && new Date(g.gameDate).getTime() <= now.getTime())
    .sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());
  const lastFinal = finals[0];

  const upcoming = games
    .filter((g) => g.status.abstractGameState === "Preview" && new Date(g.gameDate).getTime() > now.getTime())
    .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());
  const nextGame = upcoming[0];

  const pastNoon = currentHourInReferenceZone() >= 12;

  if (!pastNoon && lastFinal) return describeGame(lastFinal, teamId, "final");
  if (nextGame) return describeGame(nextGame, teamId, "upcoming");
  if (lastFinal) return describeGame(lastFinal, teamId, "final");

  const anyGame = games[0];
  const fallbackTeam = anyGame ? (anyGame.teams.home.team.id === teamId ? anyGame.teams.home.team : anyGame.teams.away.team) : undefined;
  return { teamName: fallbackTeam?.name ?? "MLB Team", teamAbbr: fallbackTeam?.abbreviation ?? "", mode: "none" };
}
