import "server-only";
import type { WeatherWidgetConfig } from "@/lib/types";
import { fetchBetterForecast, type TempestForecast } from "@/lib/tempest";

export async function fetchTempestWidgetData(
  config: WeatherWidgetConfig,
  secrets: Record<string, string>,
): Promise<TempestForecast> {
  const token = secrets.token;
  if (!token) throw new Error("Tempest API token not configured.");
  if (!config.stationId) throw new Error("No station selected.");
  return fetchBetterForecast(token, config.stationId, config.unit, config.forecastDays);
}
