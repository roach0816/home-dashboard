import "server-only";
import { integrationFetch } from "@/lib/insecureFetch";
import type { WeatherWidgetConfig } from "@/lib/types";
import { reverseGeocodeCityState, type TempestForecast, type TempestCurrent, type TempestDaily } from "@/lib/tempest";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// Field ids from Ecowitt's official HTTP API interface doc (get_livedata_info,
// common_list). Not every field carries a "unit" key — some (wind, rain)
// embed the unit directly in "val" (e.g. "3.2 mph") instead.
const ID_OUTTEMP = "0x02";
const ID_FEELSLIKE = "3"; // no 0x prefix in the real response — verified against the vendor's own example
const ID_OUTHUMI = "0x07";
const ID_WINDDIR = "0x0A";
const ID_WINDSPEED = "0x0B";
const ID_SOLAR = "0x15";

const WIND_CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
function degreesToCardinal(deg: number): string {
  const index = Math.round(deg / 22.5) % 16;
  return WIND_CARDINALS[(index + 16) % 16];
}

/** Ecowitt's "val" is either a bare number or "<number> <unit>" (e.g. "3.20 mph"); "unit" is only present separately for some fields. */
function parseNumeric(val: string | undefined): number {
  if (!val) return NaN;
  const match = val.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

type EcowittListItem = { id: string; val: string; unit?: string; battery?: string };
type EcowittLiveData = {
  common_list?: EcowittListItem[];
  rain?: EcowittListItem[];
  piezoRain?: EcowittListItem[];
};

function findItem(list: EcowittListItem[] | undefined, id: string): EcowittListItem | undefined {
  return list?.find((item) => item.id === id);
}

/**
 * Best-effort sky condition from raw sensor readings, since the local
 * gateway has no cloud-derived "conditions" concept of its own — there's
 * no forecast provider's summary to borrow the way the old Tempest
 * hybrid mode could. Rain wins outright; otherwise a rough solar-radiation
 * threshold stands in for "sunny" vs "overcast". No attempt at
 * distinguishing night (solar reads ~0 after dark regardless of sky).
 */
function inferConditions(rainRateVal: number, solarWm2: number): { icon: string; conditions: string } {
  if (rainRateVal > 0) return { icon: "rainy", conditions: "Rain" };
  if (solarWm2 > 350) return { icon: "clear-day", conditions: "Sunny" };
  if (solarWm2 > 50) return { icon: "partly-cloudy-day", conditions: "Partly Cloudy" };
  return { icon: "cloudy", conditions: "Cloudy" };
}

async function fetchEcowittCurrent(host: string, unit: "fahrenheit" | "celsius"): Promise<TempestCurrent> {
  const res = await integrationFetch(`http://${host}/get_livedata_info`, { cache: "no-store", timeoutMs: 8000 });
  if (!res.ok) throw new Error(`Ecowitt gateway error (${res.status})`);
  const data = (await res.json()) as EcowittLiveData;

  const common = data.common_list;
  const temp = findItem(common, ID_OUTTEMP);
  const feelsLike = findItem(common, ID_FEELSLIKE);
  const humi = findItem(common, ID_OUTHUMI);
  const windDir = findItem(common, ID_WINDDIR);
  const windSpeed = findItem(common, ID_WINDSPEED);
  const solar = findItem(common, ID_SOLAR);
  if (!temp) throw new Error("Gateway responded, but no outdoor sensor data was found (WS90 not paired?)");

  // The WS90's rain gauge is piezoelectric — that array is the one that's
  // actually populated for this station; "rain" is for older tipping-bucket
  // gauges. Falls back to "rain" for setups using the traditional gauge.
  const rainList = data.piezoRain?.length ? data.piezoRain : data.rain;
  const rainRate = parseNumeric(findItem(rainList, "0x0E")?.val);

  // The gateway reports in whatever unit it's configured for (get_units_info
  // controls this device-wide) — normalize everything to Fahrenheit first,
  // then convert once to whatever the widget is set to display.
  const isDeviceFahrenheit = temp.unit ? temp.unit === "F" : true;
  const toF = (raw: number) => (isDeviceFahrenheit ? raw : (raw * 9) / 5 + 32);
  const convert = (f: number) => (unit === "fahrenheit" ? f : ((f - 32) * 5) / 9);
  const tempInF = toF(parseNumeric(temp.val));
  const feelsInF = feelsLike ? toF(parseNumeric(feelsLike.val)) : tempInF;

  const { icon, conditions } = inferConditions(rainRate, parseNumeric(solar?.val));

  return {
    time: Math.floor(Date.now() / 1000),
    conditions,
    icon,
    temperature: convert(tempInF),
    feelsLike: convert(feelsInF),
    humidity: Math.round(parseNumeric(humi?.val)),
    windSpeed: parseNumeric(windSpeed?.val),
    windDirectionCardinal: windDir ? degreesToCardinal(parseNumeric(windDir.val)) : "",
  };
}

const WMO_ICON: Record<number, string> = {
  0: "clear-day",
  1: "partly-cloudy-day",
  2: "partly-cloudy-day",
  3: "cloudy",
  45: "foggy",
  48: "foggy",
  51: "possibly-rainy-day",
  53: "possibly-rainy-day",
  55: "possibly-rainy-day",
  56: "possibly-sleet-day",
  57: "possibly-sleet-day",
  61: "rainy",
  63: "rainy",
  65: "rainy",
  66: "possibly-sleet-day",
  67: "possibly-sleet-day",
  71: "snow",
  73: "snow",
  75: "snow",
  77: "snow",
  80: "possibly-rainy-day",
  81: "possibly-rainy-day",
  82: "possibly-rainy-day",
  85: "possibly-snow-day",
  86: "possibly-snow-day",
  95: "thunderstorm",
  96: "thunderstorm",
  99: "thunderstorm",
};
const WMO_TEXT: Record<number, string> = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  56: "Freezing Drizzle",
  57: "Freezing Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  66: "Freezing Rain",
  67: "Freezing Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Rain Showers",
  81: "Rain Showers",
  82: "Heavy Rain Showers",
  85: "Snow Showers",
  86: "Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

async function fetchOpenMeteoForecast(
  latitude: number,
  longitude: number,
  unit: "fahrenheit" | "celsius",
  days: number,
): Promise<TempestDaily[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: unit === "fahrenheit" ? "fahrenheit" : "celsius",
    timezone: "auto",
    forecast_days: String(Math.min(16, Math.max(1, days))),
  });
  const res = await integrationFetch(`${OPEN_METEO_URL}?${params}`, { cache: "no-store", timeoutMs: 8000 });
  if (!res.ok) throw new Error(`Forecast API error (${res.status})`);
  const body = (await res.json()) as {
    daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[] };
  };
  const daily = body.daily;
  if (!daily) return [];
  return daily.time.map((date, i) => ({
    date,
    conditions: WMO_TEXT[daily.weather_code[i]] ?? "",
    icon: WMO_ICON[daily.weather_code[i]] ?? "cloudy",
    high: daily.temperature_2m_max[i],
    low: daily.temperature_2m_min[i],
    precipProbability: daily.precipitation_probability_max[i] ?? 0,
  }));
}

export async function fetchEcowittWidgetData(config: WeatherWidgetConfig): Promise<TempestForecast> {
  if (!config.ecowittHost) throw new Error("No Ecowitt gateway host configured.");

  const current = await fetchEcowittCurrent(config.ecowittHost, config.unit);

  let daily: TempestDaily[] = [];
  if (config.display !== "current") {
    if (config.latitude == null || config.longitude == null) {
      throw new Error("Latitude/longitude required for forecast — add them in this widget's settings.");
    }
    try {
      daily = await fetchOpenMeteoForecast(config.latitude, config.longitude, config.unit, config.forecastDays);
    } catch {
      // Current conditions came straight from the local gateway and have
      // nothing to do with the cloud forecast provider — a transient
      // outage/rate-limit there shouldn't take down the whole card when
      // there's perfectly good local data to show. Degrades to no
      // forecast section rather than failing outright.
      daily = [];
    }
  }

  // Local gateways have no location of their own — reverse-geocode the
  // same coordinates given for forecast so the card's default title (when
  // no custom label is set) reads as an actual place, not a generic name.
  const cityState =
    config.latitude != null && config.longitude != null ? await reverseGeocodeCityState(config.latitude, config.longitude) : undefined;

  return {
    locationName: config.label || "Ecowitt station",
    cityState,
    unit: config.unit,
    current,
    daily,
  };
}
