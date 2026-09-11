"use client";

import type { Widget } from "@/lib/types";
import type { NextcloudData } from "@/lib/integrations/nextcloud";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { formatBytes } from "@/lib/format";
import { WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function NextcloudDisplay({ widget }: { widget: Extract<Widget, { type: "nextcloud" }> }) {
  const label = widget.config.label || "Nextcloud";
  const { data, error } = useWidgetData<NextcloudData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: data.activeUsers24h, caption: "active users (24h)" },
          { value: formatBytes(data.freeBytes), caption: "free space" },
        ]}
      />
    </div>
  );
}
