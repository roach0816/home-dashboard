"use client";

import type { Widget } from "@/lib/types";
import type { AdguardData } from "@/lib/integrations/adguard";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function AdguardDisplay({ widget }: { widget: Extract<Widget, { type: "adguard" }> }) {
  const label = widget.config.label || "AdGuard Home";
  const { data, error } = useWidgetData<AdguardData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: data.queriesToday.toLocaleString(), caption: "queries" },
          { value: Math.round(data.blockedPercent), unit: "%", caption: "blocked" },
        ]}
      />
      {data.topBlockedDomain && <StatusLine text={`Top blocked: ${data.topBlockedDomain}`} />}
    </div>
  );
}
