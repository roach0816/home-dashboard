"use client";

import type { Widget } from "@/lib/types";
import type { EnphaseData } from "@/lib/integrations/enphase";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function EnphaseDisplay({ widget }: { widget: Extract<Widget, { type: "enphase" }> }) {
  const label = widget.config.label || "Enphase Solar";
  const { data, error } = useWidgetData<EnphaseData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: (data.currentWatts / 1000).toFixed(2), unit: "kW", caption: "now" },
          { value: (data.todayWattHours / 1000).toFixed(1), unit: "kWh", caption: "today" },
        ]}
      />
    </div>
  );
}
