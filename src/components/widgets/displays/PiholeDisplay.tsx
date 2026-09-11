"use client";

import type { Widget } from "@/lib/types";
import type { PiholeData } from "@/lib/integrations/pihole";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function PiholeDisplay({ widget }: { widget: Extract<Widget, { type: "pihole" }> }) {
  const label = widget.config.label || "Pi-hole";
  const { data, error } = useWidgetData<PiholeData>(widget.id);

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
      <StatusLine text={`${data.domainsOnBlocklist.toLocaleString()} domains on blocklist`} />
    </div>
  );
}
