/**
 * Playoff series math shared by the Sports Scoreboard and MLB Magic Number
 * widgets. Everything works from ESPN's per-game "completed" flags: a
 * scheduled game (even one with a placeholder "TBD" opponent) never counts
 * toward a series, so a team isn't marked eliminated until a series is
 * actually decided against it.
 */

/** Round name → sort order through the postseason. Only these count as playoff rounds. */
export const ROUND_RANK: Record<string, number> = {
  "Wild Card": 1,
  "Wild Card Series": 1,
  ALDS: 2,
  NLDS: 2,
  ALCS: 3,
  NLCS: 3,
  "World Series": 4,
};

/** Games in each round: Wild Card best-of-3, Division Series best-of-5, LCS and World Series best-of-7. */
const BEST_OF: Record<string, number> = {
  "Wild Card": 3,
  "Wild Card Series": 3,
  ALDS: 5,
  NLDS: 5,
  ALCS: 7,
  NLCS: 7,
  "World Series": 7,
};

export type SeriesGame = {
  date: string;
  completed: boolean;
  won: boolean;
  opponentName: string;
  opponentAbbr: string;
};

export type SeriesState = {
  round: string;
  rank: number;
  bestOf: number;
  myWins: number;
  oppWins: number;
  status: "upcoming" | "in-progress" | "won" | "lost";
  opponentName: string;
  opponentAbbr: string;
  firstGameDate: string;
};

/** The round from an ESPN game headline like "ALDS - Game 2"; undefined for regular-season games. */
export function roundFromHeadline(headline: string | undefined): string | undefined {
  const round = headline?.split(" - Game")[0]?.trim();
  return round && Object.hasOwn(ROUND_RANK, round) ? round : undefined;
}

export function summarizeSeries(round: string, games: SeriesGame[]): SeriesState {
  const sorted = [...games].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const played = sorted.filter((g) => g.completed);
  const myWins = played.filter((g) => g.won).length;
  const oppWins = played.length - myWins;
  const bestOf = BEST_OF[round];
  const needed = Math.floor(bestOf / 2) + 1;
  const latest = played[played.length - 1] ?? sorted[0];

  let status: SeriesState["status"] = "in-progress";
  if (played.length === 0) status = "upcoming";
  else if (myWins >= needed) status = "won";
  else if (oppWins >= needed) status = "lost";

  return {
    round,
    rank: ROUND_RANK[round],
    bestOf,
    myWins,
    oppWins,
    status,
    opponentName: latest.opponentName,
    opponentAbbr: latest.opponentAbbr,
    firstGameDate: sorted[0].date,
  };
}

export type SeriesEvent = {
  date: string;
  competitions?: Array<{
    status?: { type?: { completed?: boolean } };
    notes?: Array<{ headline?: string }>;
    competitors?: Array<{ team?: { id?: string; displayName?: string; abbreviation?: string }; winner?: boolean }>;
  }>;
};

/** Every playoff series this team appears in, from a schedule's events, in bracket order. */
export function seriesFromEvents(events: SeriesEvent[], teamId: string): SeriesState[] {
  const byRound = new Map<string, SeriesGame[]>();
  for (const e of events) {
    const comp = e.competitions?.[0];
    const round = roundFromHeadline(comp?.notes?.[0]?.headline);
    if (!round) continue;
    const mine = comp?.competitors?.find((c) => c.team?.id === teamId);
    const opp = comp?.competitors?.find((c) => c.team?.id !== teamId);
    if (!mine || !opp) continue;
    const games = byRound.get(round) ?? [];
    games.push({
      date: e.date,
      completed: Boolean(comp?.status?.type?.completed),
      won: Boolean(mine.winner),
      opponentName: opp.team?.displayName ?? "",
      opponentAbbr: opp.team?.abbreviation ?? "TBD",
    });
    byRound.set(round, games);
  }
  return [...byRound].map(([round, games]) => summarizeSeries(round, games)).sort((a, b) => a.rank - b.rank);
}

/**
 * One line on where a series stands, from the selected team's point of view.
 * Undefined while the series hasn't started, since there's nothing to report yet.
 */
export function seriesStatusText(s: SeriesState, myAbbr: string): string | undefined {
  if (s.status === "upcoming") return undefined;
  const { round, myWins: w, oppWins: l } = s;
  if (s.status === "won") return `${round}: ${myAbbr} won ${w}-${l}`;
  if (s.status === "lost") return `${round}: ${myAbbr} lost ${w}-${l} to ${s.opponentAbbr}`;
  const bestOf = `best of ${s.bestOf}`;
  if (w === l) return `${round}: series tied ${w}-${l}, ${bestOf}`;
  return w > l
    ? `${round}: ${myAbbr} leads series ${w}-${l}, ${bestOf}`
    : `${round}: ${s.opponentAbbr} leads series ${l}-${w}, ${bestOf}`;
}
