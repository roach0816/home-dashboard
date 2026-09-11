import "server-only";
import type { PlexConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type PlexData = {
  activeSessions: number;
};

export async function fetchPlexData(
  config: PlexConfig,
  secrets: Record<string, string>,
): Promise<PlexData> {
  const token = secrets.token;
  if (!token) throw new Error("Plex token not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const res = await integrationFetch(`${base}/status/sessions`, {
    headers: { "X-Plex-Token": token, Accept: "application/json" },
    cache: "no-store",
  });
  await assertOk(res, "Plex");
  const body = (await res.json()) as { MediaContainer: { size: number } };

  return { activeSessions: body.MediaContainer.size ?? 0 };
}
