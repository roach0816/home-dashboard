"use client";

import type { Widget } from "@/lib/types";
import type { ArrData } from "@/lib/integrations/arr";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function SonarrDisplay({
  widget,
  compact,
}: {
  widget: Extract<Widget, { type: "sonarr" }>;
  compact?: boolean;
}) {
  const label = widget.config.label || "Sonarr";
  const { data, error } = useWidgetData<ArrData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} />;
  if (!data) return <WidgetLoading label={label} compact={compact} />;

  return (
    <WidgetFrame label={label} compact={compact}>
      <StatRow
        compact={compact}
        items={[
          { value: data.queueCount, caption: "in queue" },
          { value: data.upcomingCount, caption: `upcoming (${widget.config.calendarDays}d)` },
        ]}
      />
    </WidgetFrame>
  );
}
