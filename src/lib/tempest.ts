import "server-only";
import { integrationFetch } from "@/lib/insecureFetch";

const BASE_URL = "https://swd.weatherflow.com/swd/rest";

export type TempestCurrent = {
  time: number;
  conditions: string;
  icon: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirectionCardinal: string;
};

export type TempestDaily = {
  date: string;
  conditions: string;
  icon: string;
  high: number;
  low: number;
  precipProbability: number;
};

export type TempestForecast = {
  locationName: string;
  unit: "fahrenheit" | "celsius";
  current: TempestCurrent;
  daily: TempestDaily[];
};

export type TempestStation = {
  id: number;
  name: string;
};

// WeatherFlow's own docs disagree on the auth query param name ("token" vs
// "api_key") across API versions/hosts, so send the same value under both.
function authParams(token: string): string {
  return `token=${encodeURIComponent(token)}&api_key=${encodeURIComponent(token)}`;
}

async function tempestFetch(token: string, path: string, query: string): Promise<Record<string, unknown>> {
  const res = await integrationFetch(`${BASE_URL}${path}?${query}&${authParams(token)}`, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Tempest API rejected the token — double-check it in the widget's settings.");
    }
    throw new Error(`Tempest API error (${res.status})`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const status = data.status as { status_code?: number; status_message?: string } | undefined;
  if (status && status.status_code !== 0) {
    throw new Error(status.status_message || "Tempest API error");
  }
  return data;
}

export async function fetchBetterForecast(
  token: string,
  stationId: number,
  unit: "fahrenheit" | "celsius",
  days = 4,
): Promise<TempestForecast> {
  const unitsTemp = unit === "fahrenheit" ? "f" : "c";
  const unitsWind = unit === "fahrenheit" ? "mph" : "kph";
  const data = await tempestFetch(
    token,
    "/better_forecast",
    `station_id=${stationId}&units_temp=${unitsTemp}&units_wind=${unitsWind}`,
  );

  const cc = (data.current_conditions ?? {}) as Record<string, unknown>;
  const forecast = (data.forecast ?? {}) as Record<string, unknown>;
  const dailyRaw = (forecast.daily ?? []) as Array<Record<string, unknown>>;

  return {
    locationName: (data.location_name as string) || "Weather station",
    unit,
    current: {
      time: Number(cc.time),
      conditions: String(cc.conditions ?? ""),
      icon: String(cc.icon ?? ""),
      temperature: Number(cc.air_temperature),
      feelsLike: Number(cc.feels_like),
      humidity: Number(cc.relative_humidity),
      windSpeed: Number(cc.wind_avg),
      windDirectionCardinal: String(cc.wind_direction_cardinal ?? ""),
    },
    daily: dailyRaw.slice(0, days).map((d) => ({
      date: new Date(Number(d.day_start_local) * 1000).toISOString().slice(0, 10),
      conditions: String(d.conditions ?? ""),
      icon: String(d.icon ?? ""),
      high: Number(d.air_temp_high),
      low: Number(d.air_temp_low),
      precipProbability: Number(d.precip_probability ?? 0),
    })),
  };
}

export async function fetchStations(token: string): Promise<TempestStation[]> {
  const data = await tempestFetch(token, "/stations", "");
  const stations = (data.stations ?? []) as Array<Record<string, unknown>>;
  return stations.map((s) => ({
    id: Number(s.station_id),
    name: String(s.name ?? `Station ${s.station_id}`),
  }));
}
