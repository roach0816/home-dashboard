"use client";

import type { Widget } from "@/lib/types";
import type { PlexData } from "@/lib/integrations/plex";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function PlexDisplay({ widget }: { widget: Extract<Widget, { type: "plex" }> }) {
  const label = widget.config.label || "Plex";
  const { data, error } = useWidgetData<PlexData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow items={[{ value: data.activeSessions, caption: "now playing" }]} />
    </div>
  );
}
