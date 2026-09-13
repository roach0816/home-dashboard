"use client";

import type { Widget } from "@/lib/types";
import type { PortainerData } from "@/lib/integrations/portainer";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function PortainerDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "portainer" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "Portainer";
  const { data, error } = useWidgetData<PortainerData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <StatRow
        compact={compact}
        items={[
          { value: data.runningContainers, caption: "running" },
          { value: data.stoppedContainers, caption: "stopped" },
          { value: data.environmentCount, caption: "environments" },
        ]}
      />
    </WidgetFrame>
  );
}
