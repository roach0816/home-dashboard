import "server-only";
import type { JellyfinConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type JellyfinData = {
  activeSessions: number;
  movieCount?: number;
  episodeCount?: number;
};

function authHeader(apiKey: string): string {
  return `MediaBrowser Token="${apiKey}", Client="Home Dashboard", Device="Dashboard", DeviceId="home-dashboard", Version="1.0.0"`;
}

export async function fetchJellyfinData(
  config: JellyfinConfig,
  secrets: Record<string, string>,
): Promise<JellyfinData> {
  const apiKey = secrets.apiKey;
  if (!apiKey) throw new Error("Jellyfin API key not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const headers = { Authorization: authHeader(apiKey) };

  const sessionsRes = await integrationFetch(`${base}/Sessions`, { headers, cache: "no-store" });
  await assertOk(sessionsRes, "Jellyfin");
  const sessions = (await sessionsRes.json()) as Array<{ NowPlayingItem?: unknown }>;
  const activeSessions = sessions.filter((s) => s.NowPlayingItem).length;

  let movieCount: number | undefined;
  let episodeCount: number | undefined;
  try {
    const countsRes = await integrationFetch(`${base}/Items/Counts`, { headers, cache: "no-store" });
    if (countsRes.ok) {
      const counts = (await countsRes.json()) as { MovieCount?: number; EpisodeCount?: number };
      movieCount = counts.MovieCount;
      episodeCount = counts.EpisodeCount;
    }
  } catch {
    // library counts are a nice-to-have; ignore failures
  }

  return { activeSessions, movieCount, episodeCount };
}
