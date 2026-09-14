import "server-only";
import type { WeatherWidgetConfig } from "@/lib/types";
import { fetchBetterForecast, type TempestForecast, type TempestCurrent } from "@/lib/tempest";
import { getLatestLocalObservation, type LocalObservation } from "@/lib/tempestUdp";

const WIND_CARDINALS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
]; // fmt: keep

function degreesToCardinal(deg: number): string {
  const index = Math.round(deg / 22.5) % 16;
  return WIND_CARDINALS[(index + 16) % 16];
}

/**
 * Builds current-conditions from a local UDP observation. The broadcast
 * doesn't include WeatherFlow's computed conditions text, icon, or
 * feels-like value (those are cloud-only derived fields), so those carry
 * over from the last cloud fetch when available rather than being guessed.
 */
function currentFromLocal(obs: LocalObservation, unit: "fahrenheit" | "celsius", previous?: TempestCurrent): TempestCurrent {
  const temperature = unit === "fahrenheit" ? (obs.airTemperatureC * 9) / 5 + 32 : obs.airTemperatureC;
  const windSpeed = unit === "fahrenheit" ? obs.windAvgMs * 2.236936 : obs.windAvgMs * 3.6;
  return {
    time: obs.epochSeconds,
    conditions: previous?.conditions ?? "",
    icon: previous?.icon ?? "clear-day",
    temperature,
    feelsLike: previous?.feelsLike ?? temperature,
    humidity: obs.relativeHumidity,
    windSpeed,
    windDirectionCardinal: degreesToCardinal(obs.windDirectionDeg),
  };
}

export async function fetchTempestWidgetData(
  config: WeatherWidgetConfig,
  secrets: Record<string, string>,
): Promise<TempestForecast> {
  const token = secrets.token;
  if (!token) throw new Error("Tempest API token not configured.");
  if (!config.stationId) throw new Error("No station selected.");

  const localObs = config.useLocal ? getLatestLocalObservation(config.localSerial) : undefined;

  try {
    const cloud = await fetchBetterForecast(token, config.stationId, config.unit, config.forecastDays);
    if (!localObs) return cloud;
    // Local is fresher for current conditions; forecast still only exists in the cloud response.
    return { ...cloud, current: currentFromLocal(localObs, config.unit, cloud.current) };
  } catch (err) {
    if (localObs) {
      // Cloud API unreachable, but we have a live local reading — degrade
      // to local-only current conditions instead of failing the widget.
      return {
        locationName: config.label || "Tempest station (local)",
        unit: config.unit,
        current: currentFromLocal(localObs, config.unit),
        daily: [],
      };
    }
    throw err;
  }
}
