"use client";

import type { Widget } from "@/lib/types";
import type { SynologyData } from "@/lib/integrations/synology";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { formatBytes } from "@/lib/format";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function SynologyDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "synology" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "Synology NAS";
  const { data, error } = useWidgetData<SynologyData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <StatRow
        compact={compact}
        items={[
          { value: Math.round(data.usedPercent), unit: "%", caption: "storage used" },
          { value: data.volumeCount, caption: "volumes" },
        ]}
      />
      {!compact && (
        <StatusLine
          text={`${formatBytes(data.usedBytes)} of ${formatBytes(data.totalBytes)}${
            data.degradedVolumes > 0 ? ` · ${data.degradedVolumes} volume(s) degraded` : ""
          }`}
          tone={data.degradedVolumes > 0 ? "bad" : "muted"}
        />
      )}
    </WidgetFrame>
  );
}
