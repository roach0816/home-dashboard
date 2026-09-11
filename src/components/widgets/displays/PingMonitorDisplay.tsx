"use client";

import type { Widget } from "@/lib/types";
import type { PingMonitorData } from "@/lib/integrations/pingMonitor";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetLoading, WidgetError, StatusLine } from "../primitives";

export default function PingMonitorDisplay({ widget }: { widget: Extract<Widget, { type: "ping-monitor" }> }) {
  const label = widget.config.label || widget.config.host;
  const { data, error } = useWidgetData<PingMonitorData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${data.up ? "bg-emerald-500" : "bg-red-400"}`} />
      </div>
      <StatusLine
        text={
          data.up
            ? `Up${data.latencyMs != null ? ` · ${data.latencyMs}ms` : ""}`
            : "Unreachable"
        }
        tone={data.up ? "good" : "bad"}
      />
      <p className="text-[11px] text-muted">
        {widget.config.host}:{widget.config.port}
      </p>
    </div>
  );
}
