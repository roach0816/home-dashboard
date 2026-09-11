"use client";

import type { Widget } from "@/lib/types";
import type { PortainerData } from "@/lib/integrations/portainer";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function PortainerDisplay({ widget }: { widget: Extract<Widget, { type: "portainer" }> }) {
  const label = widget.config.label || "Portainer";
  const { data, error } = useWidgetData<PortainerData>(widget.id);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: data.runningContainers, caption: "running" },
          { value: data.stoppedContainers, caption: "stopped" },
          { value: data.environmentCount, caption: "environments" },
        ]}
      />
    </div>
  );
}
