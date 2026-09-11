"use client";

import type { Widget } from "@/lib/types";
import type { HomeAssistantData } from "@/lib/integrations/homeAssistant";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function HomeAssistantDisplay({ widget }: { widget: Extract<Widget, { type: "home-assistant" }> }) {
  const label = widget.config.label || "Home Assistant";
  const { data, error } = useWidgetData<HomeAssistantData>(widget.id);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: data.totalEntities, caption: "entities" },
          { value: data.unavailable, caption: "unavailable" },
        ]}
      />
    </div>
  );
}
