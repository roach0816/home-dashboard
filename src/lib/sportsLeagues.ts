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
/** All 30 MLB teams with their ESPN id and division — for the Magic Number widget's team picker, which needs no live API call since division alignment is effectively static. */
export const MLB_TEAMS: Array<{ id: string; name: string; division: string }> = [
  { id: "30", name: "Tampa Bay Rays", division: "AL East" },
  { id: "10", name: "New York Yankees", division: "AL East" },
  { id: "2", name: "Boston Red Sox", division: "AL East" },
  { id: "14", name: "Toronto Blue Jays", division: "AL East" },
  { id: "1", name: "Baltimore Orioles", division: "AL East" },
  { id: "6", name: "Detroit Tigers", division: "AL Central" },
  { id: "9", name: "Minnesota Twins", division: "AL Central" },
  { id: "7", name: "Kansas City Royals", division: "AL Central" },
  { id: "5", name: "Cleveland Guardians", division: "AL Central" },
  { id: "4", name: "Chicago White Sox", division: "AL Central" },
  { id: "11", name: "Athletics", division: "AL West" },
  { id: "3", name: "Los Angeles Angels", division: "AL West" },
  { id: "13", name: "Texas Rangers", division: "AL West" },
  { id: "18", name: "Houston Astros", division: "AL West" },
  { id: "12", name: "Seattle Mariners", division: "AL West" },
  { id: "15", name: "Atlanta Braves", division: "NL East" },
  { id: "28", name: "Miami Marlins", division: "NL East" },
  { id: "20", name: "Washington Nationals", division: "NL East" },
  { id: "21", name: "New York Mets", division: "NL East" },
  { id: "22", name: "Philadelphia Phillies", division: "NL East" },
  { id: "8", name: "Milwaukee Brewers", division: "NL Central" },
  { id: "23", name: "Pittsburgh Pirates", division: "NL Central" },
  { id: "24", name: "St. Louis Cardinals", division: "NL Central" },
  { id: "17", name: "Cincinnati Reds", division: "NL Central" },
  { id: "16", name: "Chicago Cubs", division: "NL Central" },
  { id: "19", name: "Los Angeles Dodgers", division: "NL West" },
  { id: "26", name: "San Francisco Giants", division: "NL West" },
  { id: "27", name: "Colorado Rockies", division: "NL West" },
  { id: "25", name: "San Diego Padres", division: "NL West" },
  { id: "29", name: "Arizona Diamondbacks", division: "NL West" },
];

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
