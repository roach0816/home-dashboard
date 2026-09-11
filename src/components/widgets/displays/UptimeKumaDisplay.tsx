"use client";

import type { Widget } from "@/lib/types";
import type { UptimeKumaData } from "@/lib/integrations/uptimeKuma";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function UptimeKumaDisplay({ widget }: { widget: Extract<Widget, { type: "uptime-kuma" }> }) {
  const label = widget.config.label || "Uptime Kuma";
  const { data, error } = useWidgetData<UptimeKumaData>(widget.id);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: data.up, caption: "up" },
          { value: data.down, caption: "down" },
          { value: data.pending, caption: "pending" },
        ]}
      />
    </div>
  );
}
