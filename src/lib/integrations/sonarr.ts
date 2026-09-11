import "server-only";
import type { SonarrConfig } from "@/lib/types";
import { fetchArrData, type ArrData } from "./arr";

export async function fetchSonarrData(
  config: SonarrConfig,
  secrets: Record<string, string>,
): Promise<ArrData> {
  const apiKey = secrets.apiKey;
  if (!apiKey) throw new Error("Sonarr API key not configured.");
  return fetchArrData(config.baseUrl, apiKey, config.calendarDays, "Sonarr");
}
