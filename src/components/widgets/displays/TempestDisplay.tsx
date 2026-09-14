"use client";

import type { Widget } from "@/lib/types";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { weatherEmoji } from "@/lib/weatherIcons";
import { WidgetLoading, WidgetError, SourceIcons, type DataSource } from "../primitives";
import type { TempestForecast } from "@/lib/tempest";

export default function TempestDisplay({
  widget,
  compact,
  href,
  sources,
}: {
  widget: Extract<Widget, { type: "tempest-weather" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const { config } = widget;
  const { data, error } = useWidgetData<TempestForecast>(widget.id, (config.refreshSeconds ?? 300) * 1000);
  const label = config.label || data?.cityState || data?.locationName || "Tempest station";

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} sources={sources} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} sources={sources} />;

  const unitLabel = config.unit === "fahrenheit" ? "°F" : "°C";
  const showCurrent = config.display !== "forecast";
  const showForecast = config.display !== "current";

  return (
    <div className={`flex flex-col gap-2.5 ${compact ? "p-2.5" : "p-3.5"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <div className="min-w-0 flex-1">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block truncate text-sm font-medium text-foreground hover:underline"
              >
                {label}
              </a>
            ) : (
              <p className="truncate text-sm font-medium text-foreground">{label}</p>
            )}
          </div>
          <SourceIcons sources={sources} />
        </div>
        {showCurrent && (
          // Doubles as this widget's "logo" corner — the live conditions icon is more
          // useful here than a static weather-app logo would be.
          <span className="shrink-0 text-3xl" aria-hidden>
            {weatherEmoji(data.current.icon)}
          </span>
        )}
      </div>
      {showCurrent && !compact && data.current.conditions && (
        <p className="-mt-1.5 truncate text-xs text-muted">{data.current.conditions}</p>
      )}

      {showCurrent && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-semibold text-foreground">
            {Math.round(data.current.temperature)}
            {unitLabel}
          </span>
          <div className="flex flex-col items-end gap-0.5 text-right text-xs text-muted">
            <span>
              feels {Math.round(data.current.feelsLike)}
              {unitLabel} · {data.current.humidity}% humidity
            </span>
            <span>
              {Math.round(data.current.windSpeed)} {config.unit === "fahrenheit" ? "mph" : "km/h"}{" "}
              {data.current.windDirectionCardinal}
            </span>
          </div>
        </div>
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
