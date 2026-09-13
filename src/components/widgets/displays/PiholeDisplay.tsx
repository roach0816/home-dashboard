"use client";

import type { Widget } from "@/lib/types";
import type { PiholeData } from "@/lib/integrations/pihole";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function PiholeDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "pihole" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "Pi-hole";
  const { data, error } = useWidgetData<PiholeData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <StatRow
        compact={compact}
        items={[
          { value: data.queriesToday.toLocaleString(), caption: "queries" },
          { value: Math.round(data.blockedPercent), unit: "%", caption: "blocked" },
        ]}
      />
      {!compact && <StatusLine text={`${data.domainsOnBlocklist.toLocaleString()} domains on blocklist`} />}
    </WidgetFrame>
  );
}
