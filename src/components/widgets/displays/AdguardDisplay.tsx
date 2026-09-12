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

  if (compact) {
    return (
      <WidgetFrame label={label} compact>
        <StatRow
          compact
          items={[
            { value: data.queriesToday.toLocaleString(), caption: "queries" },
            { value: Math.round(data.blockedPercent), unit: "%", caption: "blocked" },
          ]}
        />
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame label={label}>
      <StatRow
        items={[
          { value: data.queriesToday.toLocaleString(), caption: "DNS queries" },
          { value: Math.round(data.blockedPercent), unit: "%", caption: "blocked by filters" },
        ]}
      />
      <StatRow
        items={[
          { value: Math.round(data.malwarePercent), unit: "%", caption: "malware/phishing" },
          { value: Math.round(data.adultPercent), unit: "%", caption: "adult websites" },
        ]}
      />
      {data.topBlockedDomain && <StatusLine text={`Top blocked: ${data.topBlockedDomain}`} />}
    </WidgetFrame>
  );
}
