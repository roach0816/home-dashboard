"use client";

import type { Widget } from "@/lib/types";
import type { UptimeKumaData } from "@/lib/integrations/uptimeKuma";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, type DataSource } from "../primitives";

export default function UptimeKumaDisplay({
  widget,
  compact,
  href,
  icon,
  sources,
}: {
  widget: Extract<Widget, { type: "uptime-kuma" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const label = widget.config.label || "Uptime Kuma";
  const { data, error } = useWidgetData<UptimeKumaData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} sources={sources} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} sources={sources} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon} sources={sources}>
      <StatRow
        compact={compact}
        items={[
          { value: data.up, caption: "up" },
          { value: data.down, caption: "down" },
          { value: data.pending, caption: "pending" },
        ]}
      />
    </WidgetFrame>
  );
}
