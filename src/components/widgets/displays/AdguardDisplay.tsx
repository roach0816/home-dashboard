"use client";

import type { Widget } from "@/lib/types";
import type { AdguardData } from "@/lib/integrations/adguard";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function AdguardDisplay({
  widget,
  compact,
}: {
  widget: Extract<Widget, { type: "adguard" }>;
  compact?: boolean;
}) {
  const label = widget.config.label || "AdGuard Home";
  const { data, error } = useWidgetData<AdguardData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} />;
  if (!data) return <WidgetLoading label={label} compact={compact} />;

  return (
    <WidgetFrame label={label} compact={compact}>
      <StatRow
        compact={compact}
        items={[
          { value: data.queriesToday.toLocaleString(), caption: "queries" },
          { value: Math.round(data.blockedPercent), unit: "%", caption: "blocked" },
        ]}
      />
      {!compact && data.topBlockedDomain && <StatusLine text={`Top blocked: ${data.topBlockedDomain}`} />}
    </WidgetFrame>
  );
}
