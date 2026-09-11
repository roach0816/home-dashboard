"use client";

import type { Widget } from "@/lib/types";
import type { ProxmoxData } from "@/lib/integrations/proxmox";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { formatBytes } from "@/lib/format";
import { WidgetLoading, WidgetError, StatRow, StatusLine } from "../primitives";

export default function ProxmoxDisplay({ widget }: { widget: Extract<Widget, { type: "proxmox" }> }) {
  const label = widget.config.label || "Proxmox VE";
  const { data, error } = useWidgetData<ProxmoxData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} />;
  if (!data) return <WidgetLoading label={label} />;

  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <StatRow
        items={[
          { value: data.nodeCount, caption: "nodes" },
          { value: Math.round(data.avgCpuPercent), unit: "%", caption: "avg CPU" },
          { value: Math.round(data.memUsedPercent), unit: "%", caption: "memory" },
          { value: Math.round(data.diskUsedPercent), unit: "%", caption: "disk" },
        ]}
      />
      <StatRow
        items={[
          { value: `${data.vmsRunning}/${data.vmsTotal}`, caption: "VMs running" },
          { value: `${data.ctsRunning}/${data.ctsTotal}`, caption: "CTs running" },
        ]}
      />
      <StatusLine text={`${formatBytes(data.memUsedBytes)} of ${formatBytes(data.memTotalBytes)} RAM used`} />
    </div>
  );
}
