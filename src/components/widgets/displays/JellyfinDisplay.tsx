"use client";

import type { Widget } from "@/lib/types";
import type { JellyfinData } from "@/lib/integrations/jellyfin";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function JellyfinDisplay({ widget }: { widget: Extract<Widget, { type: "jellyfin" }> }) {
  const label = widget.config.label || "Jellyfin";
  const { data, error } = useWidgetData<JellyfinData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  const items = [{ value: data.activeSessions, caption: "now playing" }];
  if (data.movieCount != null) items.push({ value: data.movieCount, caption: "movies" });
  if (data.episodeCount != null) items.push({ value: data.episodeCount, caption: "episodes" });

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow items={items} />
    </div>
  );
}
