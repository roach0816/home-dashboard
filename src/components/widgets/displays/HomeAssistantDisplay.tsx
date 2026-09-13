"use client";

import type { Widget } from "@/lib/types";
import type { HomeAssistantData } from "@/lib/integrations/homeAssistant";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function HomeAssistantDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "home-assistant" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "Home Assistant";
  const { data, error } = useWidgetData<HomeAssistantData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
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
