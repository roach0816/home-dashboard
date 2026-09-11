"use client";

import type { Widget } from "@/lib/types";
import type { ArrData } from "@/lib/integrations/arr";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function RadarrDisplay({ widget }: { widget: Extract<Widget, { type: "radarr" }> }) {
  const label = widget.config.label || "Radarr";
  const { data, error } = useWidgetData<ArrData>(widget.id);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: data.queueCount, caption: "in queue" },
          { value: data.upcomingCount, caption: `upcoming (${widget.config.calendarDays}d)` },
        ]}
      />
    </div>
  );
}
