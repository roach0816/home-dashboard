"use client";

import type { Widget } from "@/lib/types";
import type { PrinterData } from "@/lib/integrations/printer";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError } from "../primitives";

export default function PrinterDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "printer-snmp" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "Printer";
  const { data, error } = useWidgetData<PrinterData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      {data.supplies.length === 0 ? (
        <p className="text-xs text-muted">No supply data reported.</p>
      ) : compact ? (
        <div className="flex flex-col gap-1">
          {data.supplies.map((supply, i) => {
            const low = supply.percent != null && supply.percent <= 15;
            const statusIsBad = supply.status != null && supply.status !== "OK";
            return (
              <div key={`${supply.description}-${i}`} className="flex items-center justify-between gap-1.5 text-[11px]">
                <span className="truncate text-foreground">{supply.description}</span>
                <span className={`shrink-0 ${low || statusIsBad ? "text-red-400" : "text-muted"}`}>
                  {supply.percent != null ? `${supply.percent}%` : (supply.status ?? "—")}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.supplies.map((supply, i) => {
            const low = supply.percent != null && supply.percent <= 15;
            const medium = supply.percent != null && supply.percent > 15 && supply.percent <= 35;
            const statusIsBad = supply.status != null && supply.status !== "OK";
            return (
              <div key={`${supply.description}-${i}`} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-foreground">{supply.description}</span>
                  <span className={low || statusIsBad ? "text-red-400" : "text-muted"}>
                    {supply.percent != null ? `${supply.percent}%` : (supply.status ?? "—")}
                  </span>
                </div>
                {supply.percent != null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={`h-full rounded-full ${low ? "bg-red-400" : medium ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${Math.max(2, Math.min(100, supply.percent))}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}
