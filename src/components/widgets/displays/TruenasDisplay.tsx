"use client";

import type { Widget } from "@/lib/types";
import type { TruenasData } from "@/lib/integrations/truenas";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { formatBytes } from "@/lib/format";
import { WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function TruenasDisplay({ widget }: { widget: Extract<Widget, { type: "truenas" }> }) {
  const label = widget.config.label || "TrueNAS";
  const { data, error } = useWidgetData<TruenasData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: Math.round(data.usedPercent), unit: "%", caption: "storage used" },
          { value: data.poolCount, caption: "pools" },
        ]}
      />
      <StatusLine
        text={`${formatBytes(data.usedBytes)} of ${formatBytes(data.totalBytes)} · ${data.activeAlerts} active alert${data.activeAlerts === 1 ? "" : "s"}`}
        tone={data.activeAlerts > 0 ? "bad" : "muted"}
      />
    </div>
  );
}
