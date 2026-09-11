"use client";

import { useEffect, useState } from "react";
import Modal from "../Modal";
import PasswordInput from "./PasswordInput";
import type { WeatherDisplayMode, WidgetCardSize, WeatherWidgetConfig } from "@/lib/types";

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
  const [tokenDraft, setTokenDraft] = useState("");
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [stations, setStations] = useState<Station[] | null>(null);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [loadingStations, setLoadingStations] = useState(false);

  const [stationId, setStationId] = useState<number | undefined>(initial?.stationId);
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

  async function handleSave() {
    if (stationId == null) return;
    setSaving(true);
    if (tokenDraft.trim()) {
      await fetch(`/api/widgets/${widgetId}/secrets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secrets: { token: tokenDraft.trim() } }),
      }).catch(() => {});
    }
    setSaving(false);
    onSave({ stationId, label: label.trim() || undefined, unit, display, forecastDays, refreshSeconds, cardSize });
  }

  const canSave = stationId != null;

  return (
    <Modal title="Tempest weather widget" onClose={onClose} widthClass="max-w-md">
      <div className="flex flex-col gap-3">
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

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Label (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Defaults to the station name"
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
          <label className="mb-1 block text-xs font-medium text-muted">Card size</label>
          <div className="flex gap-2">
            {(["full", "half"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setCardSize(size)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                  cardSize === size ? "bg-accent text-white" : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Units</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUnit("fahrenheit")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${unit === "fahrenheit" ? "bg-accent text-white" : "border border-border text-muted hover:text-foreground"}`}
            >
              °F
            </button>
            <button
              type="button"
              onClick={() => setUnit("celsius")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${unit === "celsius" ? "bg-accent text-white" : "border border-border text-muted hover:text-foreground"}`}
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
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
