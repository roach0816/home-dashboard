export const SPORTS_LEAGUES = ["nfl", "nba", "mlb", "nhl", "mls"] as const;
export type SportsLeague = (typeof SPORTS_LEAGUES)[number];

/** ESPN's site API URLs are always /apis/site/v2/sports/{sport}/{slug}/... */
export const LEAGUE_META: Record<SportsLeague, { sport: string; slug: string; label: string }> = {
  nfl: { sport: "football", slug: "nfl", label: "NFL" },
  nba: { sport: "basketball", slug: "nba", label: "NBA" },
  mlb: { sport: "baseball", slug: "mlb", label: "MLB" },
  nhl: { sport: "hockey", slug: "nhl", label: "NHL" },
  mls: { sport: "soccer", slug: "usa.1", label: "MLS" },
};

export function isSportsLeague(value: string): value is SportsLeague {
  return (SPORTS_LEAGUES as readonly string[]).includes(value);
}

/**
 * Migrating the old MLB-only widget (v0.7.0, type "mlb-team") to the
 * multi-league widget: that version stored the MLB Stats API's team id,
 * which uses a completely different numbering scheme than ESPN's team ids
 * (e.g. Guardians were 114 there, are "5" here) — see src/lib/store.ts.
 */
export const LEGACY_MLB_STATS_ID_TO_ESPN_ID: Record<number, string> = {
  108: "3", // Los Angeles Angels
  109: "29", // Arizona Diamondbacks
  110: "1", // Baltimore Orioles
  111: "2", // Boston Red Sox
  112: "16", // Chicago Cubs
  113: "17", // Cincinnati Reds
  114: "5", // Cleveland Guardians
  115: "27", // Colorado Rockies
  116: "6", // Detroit Tigers
  117: "18", // Houston Astros
  118: "7", // Kansas City Royals
  119: "19", // Los Angeles Dodgers
  120: "20", // Washington Nationals
  121: "21", // New York Mets
  133: "11", // Athletics
  134: "23", // Pittsburgh Pirates
  135: "25", // San Diego Padres
  136: "12", // Seattle Mariners
  137: "26", // San Francisco Giants
  138: "24", // St. Louis Cardinals
  139: "30", // Tampa Bay Rays
  140: "13", // Texas Rangers
  141: "14", // Toronto Blue Jays
  142: "9", // Minnesota Twins
  143: "22", // Philadelphia Phillies
  144: "15", // Atlanta Braves
  145: "4", // Chicago White Sox
  146: "28", // Miami Marlins
  147: "10", // New York Yankees
  158: "8", // Milwaukee Brewers
};
