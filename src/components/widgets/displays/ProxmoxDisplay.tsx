"use client";

import type { Widget } from "@/lib/types";
import type { ProxmoxData } from "@/lib/integrations/proxmox";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { formatBytes } from "@/lib/format";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow, StatusLine, type DataSource } from "../primitives";

export default function ProxmoxDisplay({
  widget,
  compact,
  href,
  icon,
  sources,
}: {
  widget: Extract<Widget, { type: "proxmox" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const label = widget.config.label || "Proxmox VE";
  const { data, error } = useWidgetData<ProxmoxData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} sources={sources} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} sources={sources} />;

  if (compact) {
    return (
      <WidgetFrame label={label} compact href={href} icon={icon} sources={sources}>
        <StatRow
          compact
          items={[
            { value: Math.round(data.avgCpuPercent), unit: "%", caption: "avg CPU" },
            { value: Math.round(data.memUsedPercent), unit: "%", caption: "memory" },
            { value: `${data.vmsRunning + data.ctsRunning}/${data.vmsTotal + data.ctsTotal}`, caption: "guests running" },
          ]}
        />
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame label={label} href={href} icon={icon} sources={sources}>
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
    </WidgetFrame>
  );
}
