"use client";

import type { Widget } from "@/lib/types";
import type { PlexData } from "@/lib/integrations/plex";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function PlexDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "plex" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "Plex";
  const { data, error } = useWidgetData<PlexData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <StatRow compact={compact} items={[{ value: data.activeSessions, caption: "now playing" }]} />
    </WidgetFrame>
  );
}
