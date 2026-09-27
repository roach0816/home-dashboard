"use client";

import { useEffect, useState } from "react";
import Modal from "../Modal";
import PasswordInput from "./PasswordInput";
import type { WeatherDisplayMode, WeatherProvider, WidgetCardSize, WeatherWidgetConfig } from "@/lib/types";

type Station = { id: number; name: string };

const DISPLAY_OPTIONS: Array<{ value: WeatherDisplayMode; label: string }> = [
  { value: "full", label: "Full details (current + forecast)" },
  { value: "current", label: "Current weather only" },
  { value: "forecast", label: "Forecast only" },
];

export default function TempestConfigModal({
  widgetId,
  initial,
  onSave,
  onClose,
}: {
  widgetId: string;
  initial?: Partial<WeatherWidgetConfig>;
  onSave: (config: WeatherWidgetConfig) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<WeatherProvider>(initial?.provider ?? "tempest");

  const [tokenDraft, setTokenDraft] = useState("");
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [stations, setStations] = useState<Station[] | null>(null);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationId, setStationId] = useState<number | undefined>(initial?.stationId);

  const [ecowittHost, setEcowittHost] = useState(initial?.ecowittHost ?? "");
  const [latitude, setLatitude] = useState(initial?.latitude != null ? String(initial.latitude) : "");
  const [longitude, setLongitude] = useState(initial?.longitude != null ? String(initial.longitude) : "");
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const [label, setLabel] = useState(initial?.label ?? "");
  const [unit, setUnit] = useState<"fahrenheit" | "celsius">(initial?.unit ?? "fahrenheit");
  const [display, setDisplay] = useState<WeatherDisplayMode>(initial?.display ?? "full");
  const [forecastDays, setForecastDays] = useState(initial?.forecastDays ?? 4);
  const [refreshSeconds, setRefreshSeconds] = useState(initial?.refreshSeconds ?? 300);
  const [cardSize, setCardSize] = useState<WidgetCardSize>(initial?.cardSize ?? "full");
  const [saving, setSaving] = useState(false);

  async function loadStations(token?: string) {
    setLoadingStations(true);
    setStationsError(null);
    try {
      const res = token
        ? await fetch("/api/integrations/tempest/stations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          })
        : await fetch(`/api/widgets/${widgetId}/tempest-stations`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load stations");
      setStations(body.stations);
    } catch (err) {
      setStationsError(err instanceof Error ? err.message : "Failed to load stations");
    } finally {
      setLoadingStations(false);
    }
  }

  useEffect(() => {
    fetch(`/api/widgets/${widgetId}/secrets`)
      .then((res) => res.json())
      .then((body) => {
        const configured = Boolean(body.status?.token);
        setTokenConfigured(configured);
        if (configured) loadStations();
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetId]);

  function buildConfig(): WeatherWidgetConfig {
    return {
      provider,
      stationId: provider === "tempest" ? stationId : undefined,
      ecowittHost: provider === "ecowitt" ? ecowittHost.trim() || undefined : undefined,
      latitude: provider === "ecowitt" && latitude.trim() ? Number(latitude) : undefined,
      longitude: provider === "ecowitt" && longitude.trim() ? Number(longitude) : undefined,
      label: label.trim() || undefined,
      unit,
      display,
      forecastDays,
      refreshSeconds,
      cardSize,
    };
  }

  async function testConnection() {
    setTestState("testing");
    setTestMessage(null);
    try {
      const res = await fetch("/api/widgets/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tempest-weather", config: buildConfig(), secrets: {}, widgetId }),
      });
      const body = await res.json();
      if (body.ok) setTestState("ok");
      else {
        setTestState("error");
        setTestMessage(body.error || "Test failed");
      }
    } catch {
      setTestState("error");
      setTestMessage("Could not reach the server.");
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    if (provider === "tempest" && tokenDraft.trim()) {
      await fetch(`/api/widgets/${widgetId}/secrets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secrets: { token: tokenDraft.trim() } }),
      }).catch(() => {});
    }
    setSaving(false);
    onSave(buildConfig());
  }

  const needsForecastLocation = provider === "ecowitt" && display !== "current";
  const canSave =
    provider === "tempest"
      ? stationId != null
      : ecowittHost.trim().length > 0 && (!needsForecastLocation || (latitude.trim() && longitude.trim()));

  return (
    <Modal title="Weather widget" onClose={onClose} widthClass="max-w-md">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Weather service</label>
          <div className="flex gap-2">
            {(
              [
                { value: "tempest" as const, label: "Tempest" },
                { value: "ecowitt" as const, label: "Ecowitt" },
              ]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProvider(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  provider === opt.value ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {provider === "tempest" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Tempest API token</label>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <PasswordInput
                    value={tokenDraft}
                    onChange={setTokenDraft}
                    placeholder={tokenConfigured ? "•••••••••••• (configured)" : "Paste your token"}
                  />
                </div>
                <button
                  type="button"
                  disabled={!tokenDraft.trim() || loadingStations}
                  onClick={() => loadStations(tokenDraft.trim())}
                  className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-40"
                >
                  Load stations
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Get one from{" "}
                <a
                  href="https://tempestwx.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-foreground"
                >
                  tempestwx.com
                </a>
                .
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Station</label>
              {loadingStations && <p className="text-xs text-muted">Loading your stations…</p>}
              {stationsError && (
                <p className="rounded-md border border-red-400/30 bg-red-500/5 p-2 text-xs text-red-400">
                  {stationsError}
                </p>
              )}
              {!loadingStations && stations && stations.length === 0 && (
                <p className="text-xs text-muted">No stations found on this Tempest account.</p>
              )}
              {!loadingStations && stations && stations.length > 0 && (
                <select
                  value={stationId ?? ""}
                  onChange={(e) => setStationId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                >
                  <option value="" disabled>
                    Choose a station…
                  </option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {provider === "ecowitt" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Gateway IP / hostname</label>
              <input
                value={ecowittHost}
                onChange={(e) => setEcowittHost(e.target.value)}
                placeholder="192.168.1.80"
                className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              />
              <p className="mt-1 text-[11px] text-muted">
                Your GW1100/GW2000/console&rsquo;s local IP — current conditions (temperature, humidity, wind, rain,
                UV) are read directly from it over your local network, no cloud account needed.
              </p>
            </div>

            {display !== "current" && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-muted">Latitude</label>
                  <input
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="41.4993"
                    className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-muted">Longitude</label>
                  <input
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="-81.6944"
                    className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}
            {display !== "current" && (
              <p className="-mt-2 text-[11px] text-muted">
                The gateway has no location of its own, so forecast (from Open-Meteo, no key needed) needs
                coordinates for where your station actually is.
              </p>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <button
                type="button"
                onClick={testConnection}
                disabled={testState === "testing" || !ecowittHost.trim()}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-50"
              >
                {testState === "testing" ? "Testing…" : "Test connection"}
              </button>
              {testState === "ok" && <span className="text-xs text-emerald-500">Connected</span>}
              {testState === "error" && <span className="max-w-[60%] text-right text-xs text-red-400">{testMessage}</span>}
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Label (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={provider === "tempest" ? "Defaults to the station name" : "Defaults to \"Ecowitt station\""}
            className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Refresh interval (seconds)</label>
          <input
            type="number"
            min={5}
            max={3600}
            value={refreshSeconds}
            onChange={(e) => {
              const n = Number(e.target.value);
              setRefreshSeconds(Number.isFinite(n) ? Math.min(3600, Math.max(5, Math.trunc(n))) : 5);
            }}
            className="w-28 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Card height</label>
          <div className="flex gap-2">
            {(
              [
                { value: "full", label: "Full" },
                { value: "half", label: "Half" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCardSize(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  cardSize === opt.value ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            Same width, less vertical space — Half shows a condensed version of the data.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Units</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUnit("fahrenheit")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${unit === "fahrenheit" ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:text-foreground"}`}
            >
              °F
            </button>
            <button
              type="button"
              onClick={() => setUnit("celsius")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${unit === "celsius" ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:text-foreground"}`}
            >
              °C
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Show</label>
          <div className="flex flex-col gap-1.5">
            {DISPLAY_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="weather-display"
                  checked={display === opt.value}
                  onChange={() => setDisplay(opt.value)}
                  className="accent-accent"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {display !== "current" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Forecast days</label>
            <input
              type="number"
              min={1}
              max={10}
              value={forecastDays}
              onChange={(e) => {
                const n = Number(e.target.value);
                setForecastDays(Number.isFinite(n) ? Math.min(10, Math.max(1, Math.trunc(n))) : 1);
              }}
              className="w-20 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
