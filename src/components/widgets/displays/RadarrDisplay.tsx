"use client";

import type { Widget } from "@/lib/types";
import type { ArrData } from "@/lib/integrations/arr";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, type DataSource } from "../primitives";

export default function RadarrDisplay({
  widget,
  compact,
  href,
  icon,
  sources,
}: {
  widget: Extract<Widget, { type: "radarr" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const label = widget.config.label || "Radarr";
  const { data, error } = useWidgetData<ArrData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} sources={sources} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} sources={sources} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon} sources={sources}>
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
