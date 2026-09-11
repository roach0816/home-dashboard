import "server-only";
import type { RadarrConfig } from "@/lib/types";
import { fetchArrData, type ArrData } from "./arr";

export async function fetchRadarrData(
  config: RadarrConfig,
  secrets: Record<string, string>,
): Promise<ArrData> {
  const apiKey = secrets.apiKey;
  if (!apiKey) throw new Error("Radarr API key not configured.");
  return fetchArrData(config.baseUrl, apiKey, config.calendarDays, "Radarr");
}
