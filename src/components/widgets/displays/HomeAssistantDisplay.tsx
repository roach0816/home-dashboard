"use client";

import type { Widget } from "@/lib/types";
import type { HomeAssistantData } from "@/lib/integrations/homeAssistant";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, type DataSource } from "../primitives";

export default function HomeAssistantDisplay({
  widget,
  compact,
  href,
  icon,
  sources,
}: {
  widget: Extract<Widget, { type: "home-assistant" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const label = widget.config.label || "Home Assistant";
  const { data, error } = useWidgetData<HomeAssistantData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} sources={sources} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} sources={sources} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon} sources={sources}>
      <StatRow
        compact={compact}
        items={[
          { value: data.totalEntities, caption: "entities" },
          { value: data.unavailable, caption: "unavailable" },
        ]}
      />
    </WidgetFrame>
  );
}
