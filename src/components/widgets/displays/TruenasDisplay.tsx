"use client";

import type { Widget } from "@/lib/types";
import type { TruenasData } from "@/lib/integrations/truenas";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { formatBytes } from "@/lib/format";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function TruenasDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "truenas" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "TrueNAS";
  const { data, error } = useWidgetData<TruenasData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <StatRow
        compact={compact}
        items={[
          { value: Math.round(data.usedPercent), unit: "%", caption: "storage used" },
          { value: data.poolCount, caption: "pools" },
        ]}
      />
      {!compact && (
        <StatusLine
          text={`${formatBytes(data.usedBytes)} of ${formatBytes(data.totalBytes)} · ${data.activeAlerts} active alert${data.activeAlerts === 1 ? "" : "s"}`}
          tone={data.activeAlerts > 0 ? "bad" : "muted"}
        />
      )}
      {compact && data.activeAlerts > 0 && <StatusLine text={`${data.activeAlerts} alert${data.activeAlerts === 1 ? "" : "s"}`} tone="bad" />}
    </WidgetFrame>
  );
}
