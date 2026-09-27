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
  /** "City, ST" from reverse-geocoding the station's coordinates — undefined if that lookup failed. */
  cityState?: string;
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

// A station's coordinates don't move, so its "City, ST" never changes —
// but this was being re-fetched on every single poll (every few minutes,
// forever) against a free, keyless geocoding API. That's an unbounded
// number of calls over a station's lifetime for a value that's static,
// and a very plausible way to eventually trip that API's rate limiting.
// A successful lookup is cached for the life of the process; a failed one
// only briefly, so a transient hiccup (or an exhausted quota that resets)
// gets retried instead of being stuck either way forever.
const CITY_STATE_SUCCESS_TTL_MS = Number.POSITIVE_INFINITY;
const CITY_STATE_FAILURE_TTL_MS = 60 * 60 * 1000;
const cityStateCache = new Map<string, { value: string | undefined; expiresAt: number }>();

/** Best-effort reverse geocode of a station's coordinates to "City, ST". Never throws. */
export async function reverseGeocodeCityState(latitude: number, longitude: number): Promise<string | undefined> {
  // Round to ~11m precision — plenty for "which city/town is this in" while
  // still sharing a cache entry across floating-point noise in stored coords.
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = cityStateCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  let value: string | undefined;
  try {
    const res = await integrationFetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { cache: "no-store", timeoutMs: 5000 },
    );
    if (res.ok) {
      const body = (await res.json()) as {
        city?: string;
        locality?: string;
        principalSubdivisionCode?: string;
        principalSubdivision?: string;
      };
      const city = body.city || body.locality;
      const state = body.principalSubdivisionCode?.split("-")[1] || body.principalSubdivision;
      value = city && state ? `${city}, ${state}` : city || state || undefined;
    }
  } catch {
    value = undefined;
  }

  cityStateCache.set(key, {
    value,
    expiresAt: Date.now() + (value !== undefined ? CITY_STATE_SUCCESS_TTL_MS : CITY_STATE_FAILURE_TTL_MS),
  });
  return value;
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

  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  const cityState = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? await reverseGeocodeCityState(latitude, longitude)
    : undefined;

  return {
    locationName: (data.location_name as string) || "Weather station",
    cityState,
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

export async function fetchTempestWidgetData(
  config: { stationId?: number; unit: "fahrenheit" | "celsius"; forecastDays: number },
  secrets: Record<string, string>,
): Promise<TempestForecast> {
  const token = secrets.token;
  if (!token) throw new Error("Tempest API token not configured.");
  if (!config.stationId) throw new Error("No station selected.");
  return fetchBetterForecast(token, config.stationId, config.unit, config.forecastDays);
}

export async function fetchStations(token: string): Promise<TempestStation[]> {
  const data = await tempestFetch(token, "/stations", "");
  const stations = (data.stations ?? []) as Array<Record<string, unknown>>;
  return stations.map((s) => ({
    id: Number(s.station_id),
    name: String(s.name ?? `Station ${s.station_id}`),
  }));
}
