"use client";

import type { Widget } from "@/lib/types";
import type { NextcloudData } from "@/lib/integrations/nextcloud";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { formatBytes } from "@/lib/format";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function NextcloudDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "nextcloud" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "Nextcloud";
  const { data, error } = useWidgetData<NextcloudData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <StatRow
        compact={compact}
        items={[
          { value: data.activeUsers24h, caption: "active users (24h)" },
          { value: formatBytes(data.freeBytes), caption: "free space" },
        ]}
      />
    </WidgetFrame>
  );
}
