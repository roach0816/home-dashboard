"use client";

import type { Widget } from "@/lib/types";
import type { JellyfinData } from "@/lib/integrations/jellyfin";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function JellyfinDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "jellyfin" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "Jellyfin";
  const { data, error } = useWidgetData<JellyfinData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  const items = [{ value: data.activeSessions, caption: "now playing" }];
  if (data.movieCount != null) items.push({ value: data.movieCount, caption: "movies" });
  if (data.episodeCount != null) items.push({ value: data.episodeCount, caption: "episodes" });

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <StatRow compact={compact} items={items} />
    </WidgetFrame>
  );
}
