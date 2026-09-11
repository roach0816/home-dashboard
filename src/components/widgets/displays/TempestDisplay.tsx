"use client";

import type { Widget } from "@/lib/types";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { weatherEmoji } from "@/lib/weatherIcons";
import { WidgetLoading, WidgetError } from "../primitives";
import type { TempestForecast } from "@/lib/tempest";

export default function TempestDisplay({ widget }: { widget: Extract<Widget, { type: "tempest-weather" }> }) {
  const { config } = widget;
  const { data, error } = useWidgetData<TempestForecast>(widget.id);
  const label = config.label || data?.locationName || "Tempest station";

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  const unitLabel = config.unit === "fahrenheit" ? "°F" : "°C";
  const showCurrent = config.display !== "forecast";
  const showForecast = config.display !== "current";

  return (
    <div className="flex flex-col gap-3 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          {showCurrent && <p className="truncate text-xs text-muted">{data.current.conditions}</p>}
        </div>
        {showCurrent && (
          <span className="shrink-0 text-3xl" aria-hidden>
            {weatherEmoji(data.current.icon)}
          </span>
        )}
      </div>

      {showCurrent && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">
              {Math.round(data.current.temperature)}
              {unitLabel}
            </span>
            <span className="text-xs text-muted">
              feels {Math.round(data.current.feelsLike)}
              {unitLabel}
            </span>
          </div>
          <p className="-mt-2 text-xs text-muted">
            {data.current.humidity}% humidity · {Math.round(data.current.windSpeed)}{" "}
            {config.unit === "fahrenheit" ? "mph" : "km/h"} {data.current.windDirectionCardinal}
          </p>
        </>
      )}

      {showForecast && data.daily.length > 0 && (
        <div className={`flex justify-between gap-1 ${showCurrent ? "border-t border-border pt-2.5" : ""}`}>
          {data.daily.map((day) => {
            const weekday = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: "short",
            });
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-0.5">
                <span className="text-[11px] text-muted">{weekday}</span>
                <span className="text-base" aria-hidden>
                  {weatherEmoji(day.icon)}
                </span>
                <span className="text-[11px] text-foreground">{Math.round(day.high)}°</span>
                <span className="text-[11px] text-muted">{Math.round(day.low)}°</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
