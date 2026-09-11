"use client";

import type { Widget } from "@/lib/types";
import type { PortainerData } from "@/lib/integrations/portainer";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function PortainerDisplay({
  widget,
  compact,
}: {
  widget: Extract<Widget, { type: "portainer" }>;
  compact?: boolean;
}) {
  const label = widget.config.label || "Portainer";
  const { data, error } = useWidgetData<PortainerData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} />;
  if (!data) return <WidgetLoading label={label} compact={compact} />;

  const items = [
    { value: data.runningContainers, caption: "running" },
    { value: data.stoppedContainers, caption: "stopped" },
  ];
  if (!compact) items.push({ value: data.environmentCount, caption: "environments" });

  return (
    <WidgetFrame label={label} compact={compact}>
      <StatRow compact={compact} items={items} />
    </WidgetFrame>
  );
}
