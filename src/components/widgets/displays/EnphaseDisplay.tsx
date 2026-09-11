"use client";

import type { Widget } from "@/lib/types";
import type { EnphaseData } from "@/lib/integrations/enphase";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function EnphaseDisplay({
  widget,
  compact,
}: {
  widget: Extract<Widget, { type: "enphase" }>;
  compact?: boolean;
}) {
  const label = widget.config.label || "Enphase Solar";
  const { data, error } = useWidgetData<EnphaseData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} />;
  if (!data) return <WidgetLoading label={label} compact={compact} />;

  return (
    <WidgetFrame label={label} compact={compact}>
      <StatRow
        compact={compact}
        items={[
          { value: (data.currentWatts / 1000).toFixed(2), unit: "kW", caption: "now" },
          { value: (data.todayWattHours / 1000).toFixed(1), unit: "kWh", caption: "today" },
        ]}
      />
    </WidgetFrame>
  );
}
